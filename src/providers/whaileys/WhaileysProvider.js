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
    this.isConnecting = false
  }

  async connect(phone, webhooks) {
    if (this.isConnecting) return
    this.isConnecting = true

    this.phone = phone

    if (this.sock) {
      try {
        await this.sock.logout()
      } catch {}
      try {
        await this.sock.ws.close()
      } catch {}
      this.sock = null
    }

    let version
    if (env.WA_VERSION) {
      version = env.WA_VERSION
    } else {
      const versionInfo = await fetchLatestWaWebVersion()
      version = versionInfo.version
    }

    const sessionPath = `data/sessions/${phone}`
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

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
        return store.messages.get(key.id)
      },
    })

    sock.phone = phone

    baileysMessageListeners(sock, phone)

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        const retries = this.retriesQrCodeMap.get(phone) || 0

        if (retries >= 3) {
          try {
            await sock.ws.close()
          } catch {}
          this.retriesQrCodeMap.delete(phone)
          return
        }

        this.retriesQrCodeMap.set(phone, retries + 1)
        sock.qr = qr
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode

        if (code === 403) {
          await this.disconnect(phone)
          return
        }

        const shouldReconnect = code !== DisconnectReason.loggedOut

        if (shouldReconnect) {
          setTimeout(() => {
            this.connect(phone, webhooks)
          }, 2000)
        } else {
          await this.disconnect(phone)
        }
      }
    })

    sock.ev.on('creds.update', saveCreds)

    this.sock = sock
    this.isConnecting = false
  }

  async disconnect(phone) {
    if (this.sock) {
      try {
        await this.sock.logout()
      } catch (error) {
        logger.error(error)
      }
      try {
        this.sock.ev.removeAllListeners('creds.update')
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
      this.sock = null
    }

    this.isConnecting = false

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
    return await sendMessage({ sock: this.sock, number: to, content: { text } })
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
        return { number, name: c.name }
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
      return await this.sock.profilePictureUrl(number)
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

  async sendTemplate() {
    throw new Error('Templates not supported in whaileys provider')
  }
}

module.exports = WhaileysProvider
