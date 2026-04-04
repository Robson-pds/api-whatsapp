const logger = require('../utils/logger.js')
const providerManager = require('../providers/ProviderManager.js')

const readMessages = async (req, res) => {
  const { phone } = req.params

  const provider = providerManager.getProvider(phone)
  if (!provider) {
    return res.status(400).json({ message: 'Sessão não encontrada.' })
  }

  try {
    await provider.markAsRead(req.body.remoteJid)
    res.status(200).json({ message: 'Mensagens lidas com sucesso' })
  } catch (error) {
    logger.error(error)
    res.status(400).json({ message: 'Erro ao ler mensagens' })
  }
}

module.exports = readMessages
