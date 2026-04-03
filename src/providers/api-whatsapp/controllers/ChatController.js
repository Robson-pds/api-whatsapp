const { markMessages } = require('../lib/graphAPI.js')
const logger = require('../utils/logger.js')

const readMessages = async (req, res) => {
  const { sessionId } = req.params
  const { messages } = req.body

  try {
    const messageId = messages?.[0]?.id
    if (!messageId) {
      return res.status(400).json({ message: 'messageId é obrigatório' })
    }

    await markMessages(messageId, sessionId)

    return res.status(200).json({ message: 'Mensagens lidas com sucesso' })
  } catch (error) {
    logger.error(error)
    return res.status(400).json({ message: 'Erro ao ler mensagens' })
  }
}

module.exports = { readMessages }
