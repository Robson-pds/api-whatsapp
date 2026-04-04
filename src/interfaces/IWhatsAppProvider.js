class IWhatsAppProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async connect(phone, webhooks) {
    throw new Error('Não implementado "connect"')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async disconnect(phone) {
    throw new Error('Não implementado "disconnect"')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendText(to, text) {
    throw new Error('Não implementado "sendText"')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendMedia(to, media) {
    throw new Error('Não implementado "sendMedia"')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendTemplate(to, template) {
    throw new Error('Não implementado "sendTemplate"')
  }

  async getContacts() {
    throw new Error('Não implementado "getContacts"')
  }

  async checkContact(number) {
    throw new Error('Não implementado "checkContact"')
  }

  async getProfilePicture(number) {
    throw new Error('Não implementado "getProfilePicture"')
  }

  async markAsRead(chatId) {
    throw new Error('Não implementado "markAsRead"')
  }

  async getUnreadMessages() {
    throw new Error('Não implementado "getUnreadMessages"')
  }

  async prepareMediaContent(media, body) {
    throw new Error('Não implementado "prepareMediaContent"')
  }

  async addWebhook(type, url) {
    throw new Error('Não implementado "addWebhook"')
  }

  getQR() {
    throw new Error('Não implementado "getQR"')
  }
}

module.exports = IWhatsAppProvider
