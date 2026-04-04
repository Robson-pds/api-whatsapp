const logger = require('../../../../utils/logger.js')
const { store } = require('../../libbaileys.js')
const { getLidByJid } = require('./contactsMemory')
const { replaceNonDigits } = require('../../../../utils/replaceNonDigits.js')

const sendMessage = async ({ sock, number, content }) => {
  try {
    const [contact] = await sock.onWhatsApp(number)

    if (contact && contact.exists > 0) {
      const jid = replaceNonDigits(contact.jid)

      const lid = getLidByJid(jid)
      if (lid) {
        const message = await sock.sendMessage(`${lid}@lid`, content)
        store.messages.set(message.key.id, message)
        return true
      }

      const message = await sock.sendMessage(`${jid}@s.whatsapp.net`, content)
      store.messages.set(message.key.id, message)
      return true
    } else {
      throw new Error('Contato invalido: ' + number)
    }
  } catch (error) {
    logger.error(error)
    throw new Error(error)
  }
}

module.exports = sendMessage
