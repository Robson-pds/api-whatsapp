const IWhatsAppProvider = require('../../interfaces/IWhatsAppProvider.js')
const NodeCache = require('node-cache')
const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestWaWebVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  isJidBroadcast,
  isJidNewsletter,
  isJidGroup,
  Boom,
} = require('baileys')
const P = require('pino')
const { format } = require('date-fns')
const fs = require('fs')
const { readFileSync } = require('fs')
const logger = require('../../utils/logger.js')
const slugfy = require('../../utils/slugfy.js')
const { baileysMessageListeners } = require('./listeners.js')
const env = require('../../utils/Env.js')
const sendMessage = require('./lib/helpers/sendMessage.js')
const GetAllUnreadMessages = require('./lib/unreadMessages.js')
const {
  prepareMediaMessageContent,
} = require('./lib/prepareMediaMessageContent.js')

const loggerBaileys = P({
  timestamp: () => `,"time":"${new Date().toJSON()}"`,
  level: 'fatal',
})

const store = {
  messages: new NodeCache({ stdTTL: 20, checkperiod: 30 }),
}

class WhaileysProvider extends IWhatsAppProvider {
  constructor() {
    super()
    this.sock = null
    this.phone = null
    this.retriesQrCodeMap = new Map()
  }

  async connect(phone, webhooks) {
    this.phone = phone
    let version
    if (env.WA_VERSION) {
      version = env.WA_VERSION
    } else {
      const versionInfo = await fetchLatestWaWebVersion()
      version = versionInfo.version
    }

    const sessionPath = `data/sessions/${phone}`
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

    let retriesQrCode = 0
    const sock = makeWASocket({
      logger: loggerBaileys,
      linkPreviewImageThumbnailWidth: 150,
      generateHighQualityLinkPreview: true,
      receivedPendingNotifications: true,
      browser: ['ApiBaileys', '', ''],
      defaultQueryTimeoutMs: 0,
      shouldIgnoreJid: (jid) =>
        isJidBroadcast(jid) || isJidNewsletter(jid) || isJidGroup(jid),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(
          state.keys,
          P({
            timestamp: () =>
              `,"time":"${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}"`,
            level: 'info',
          }),
        ),
      },
      version,
      syncFullHistory: true,
      getMessage: async (key) => {
        const msg = store.messages.get(key.id)
        return msg
      },
    })

    sock.phone = phone

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, isOnline } = update

      if (qr) {
        const retries = this.retriesQrCodeMap.get(phone) || 0
        if (retries > 3) {
          await sock.ws.close()
          this.retriesQrCodeMap.delete(phone)
          return
        }
        this.retriesQrCodeMap.set(phone, (retriesQrCode += 1))
        sock.qr = qr
      }

      if (
        connection === 'open' ||
        update?.receivedPendingNotifications ||
        isOnline
      ) {
        baileysMessageListeners(sock, phone)
      }

      if (connection === 'close') {
        const shouldReconnect =
          lastDisconnect?.error instanceof Boom
            ? lastDisconnect.error.output.statusCode !==
              DisconnectReason.loggedOut
            : true
        if (shouldReconnect) {
          this.connect(phone, webhooks)
        }
      }
    })

    sock.ev.on('creds.update', saveCreds)

    this.sock = sock
    return sock
  }

  async disconnect(phone) {
    if (this.sock) {
      try {
        await this.sock.logout()
      } catch (error) {
        logger.error(error)
      }
      try {
        this.sock.ev.removeAllListeners('connection.update')
      } catch (error) {
        logger.error(error)
      }
      try {
        await this.sock.ws.close()
      } catch (error) {
        logger.error(error)
      }
    }

    try {
      fs.rmSync(`data/connections/${phone}.json`, { force: true })
    } catch (error) {
      logger.error(error)
    }
    try {
      fs.rmSync(`data/sessions/${phone}`, { recursive: true, force: true })
    } catch (error) {
      logger.error(error)
    }
    try {
      fs.rmSync(`data/sessions/${phone}.json`, { force: true })
    } catch (error) {
      logger.error(error)
    }
  }

  async sendText(to, text) {
    const content = { text }
    return await sendMessage({ sock: this.sock, number: to, content })
  }

  async sendMedia(to, media) {
    return await sendMessage({ sock: this.sock, number: to, content: media })
  }

  async addWebhook(type, url) {
    const path = `data/connections/${this.phone}.json`
    const data = JSON.parse(fs.readFileSync(path, 'utf-8'))
    data.webhooks = {
      ...data.webhooks,
      [type]: url,
    }
    fs.writeFileSync(path, JSON.stringify(data), { flag: 'w' })
  }

  getQR() {
    return this.sock ? this.sock.qr : null
  }

  async getContacts() {
    const contacts = []
    try {
      const path = `data/sessions/${slugfy(this.phone)}.json`
      const contactsBuffer = readFileSync(path)
      const contactsData = JSON.parse(contactsBuffer.toString())
      const contactsFiltered = contactsData.map((c) => {
        if (c.id === 'status@broadcast' || c.id.includes('g.us')) return false
        const number = c.id.split('@')[0]
        return {
          number,
          name: c.name,
        }
      })
      contacts.push(...contactsFiltered)
    } catch (err) {
      logger.error(`Could not get whatsapp contacts from phone. ${err}`)
    }
    return contacts
  }

  async checkContact(number) {
    try {
      const validNumber = await this.sock.onWhatsApp(number.split('@')[0])
      return validNumber.length > 0 && validNumber[0].exists
    } catch (err) {
      logger.error(err)
      return false
    }
  }

  async getProfilePicture(number) {
    try {
      const picture = await this.sock.profilePictureUrl(number)
      return picture
    } catch (err) {
      logger.error(err)
      return null
    }
  }

  async markAsRead(chatId) {
    try {
      await this.sock.chatModify({ markRead: true, lastMessages: [] }, chatId)
      return true
    } catch (err) {
      logger.error(err)
      return false
    }
  }

  async getUnreadMessages() {
    return await GetAllUnreadMessages(this.phone)
  }

  async prepareMediaContent(media, body) {
    return await prepareMediaMessageContent({ media, body })
  }

  async sendTemplate(to, template) {
    throw new Error('Templates not supported in whaileys provider')
  }
}

module.exports = WhaileysProvider
