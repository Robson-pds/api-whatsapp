const IWhatsAppProvider = require('../../interfaces/IWhatsAppProvider.js')
const fs = require('fs')
const logger = require('../../utils/logger.js')
const sendMessage = require('./lib/helpers/sendMessage.js')
const getAccessToken = require('./lib/helpers/getAccessToken.js')
const enableSubscriptionsWebhook = require('./lib/helpers/enableSubscriptionsWebhook.js')
const registerPhoneNumber = require('./lib/helpers/registerPhoneNumber.js')

class OficialProvider extends IWhatsAppProvider {
  constructor() {
    super()
    this.phone = null
    this.webhooks = {}
  }

  async connect(phone, webhooks) {
    this.phone = phone
    this.webhooks = webhooks

    try {
      const connectionFilePath = `data/connections/${phone}.json`

      fs.mkdirSync('data/connections', { recursive: true })

      let existingData = {}
      if (fs.existsSync(connectionFilePath)) {
        try {
          existingData =
            JSON.parse(fs.readFileSync(connectionFilePath, 'utf-8')) ?? {}
        } catch {
          existingData = {}
        }
      }

      const sessionData = existingData

      const accessToken = await getAccessToken(sessionData.code)

      if (!accessToken) {
        logger.error('Erro ao obter token de acesso')
        return null
      }

      const responseHook = await enableSubscriptionsWebhook(
        sessionData.wabaId,
        accessToken,
      )

      const pin = await registerPhoneNumber(
        responseHook?.phoneNumberId,
        accessToken,
      )

      const data = {
        sessionId: sessionData.sessionId,
        sessionName: sessionData.sessionName,
        sessionKey: sessionData.sessionKey,
        whatsappAccountId: sessionData.wabaId,
        token: accessToken,
        phoneNumberId: responseHook?.phoneNumberId,
        pin,
        webhooks: sessionData.webhooks,
      }

      const mergedData = {
        ...existingData,
        ...data,
        webhooks: {
          ...(existingData.webhooks ?? {}),
          ...(data.webhooks ?? {}),
        },
      }

      fs.writeFileSync(connectionFilePath, JSON.stringify(mergedData))

      return mergedData
    } catch (error) {
      logger.error(error)
      return null
    }
  }

  async disconnect(phone) {
    try {
      fs.rmSync(`data/connections/${phone}.json`, { force: true })
    } catch (error) {
      logger.error(error)
    }
  }

  async sendText(to, text) {
    const options = {
      type: 'text',
      text: {
        body: text,
      },
    }
    return await sendMessage(to, options, this.phone)
  }

  async sendMedia(to, media) {
    return await sendMessage(to, media, this.phone)
  }

  async getContacts() {
    return []
  }

  async checkContact() {
    return true
  }

  async getProfilePicture() {
    return null
  }

  async markAsRead() {
    throw new Error('Opção não suportada na API Oficial')
  }

  async getUnreadMessages() {
    throw new Error('Opção não suportada na API Oficial')
  }

  async prepareMediaContent(media, body) {
    return {
      media: media.data,
      body,
      name: media.name,
    }
  }

  async addWebhook(type, url) {
    this.webhooks[type] = url
    const path = `data/connections/${this.phone}.json`
    const data = JSON.parse(fs.readFileSync(path, 'utf-8'))
    data.webhooks = this.webhooks
    fs.writeFileSync(path, JSON.stringify(data), { flag: 'w' })
  }

  async sendTemplate(to, template) {
    const options = {
      type: 'template',
      template,
    }
    return await sendMessage(to, options, this.phone)
  }

  getQR() {
    return null
  }
}

module.exports = OficialProvider
