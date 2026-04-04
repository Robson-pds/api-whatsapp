const IWhatsAppProvider = require('../../interfaces/IWhatsAppProvider.js')
const fs = require('fs')
const logger = require('../../utils/logger.js')
const sendMessage = require('./lib/helpers/sendMessage.js')

class OficialProvider extends IWhatsAppProvider {
  constructor() {
    super()
    this.phone = null
    this.webhooks = {}
  }

  async connect(phone, webhooks) {
    this.phone = phone
    this.webhooks = webhooks
    return { phone, webhooks }
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

  async checkContact(number) {
    return true
  }

  async getProfilePicture(number) {
    return null
  }

  async markAsRead(chatId) {
    return true
  }

  async getUnreadMessages() {
    throw new Error('Unread messages not supported in oficial provider')
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
