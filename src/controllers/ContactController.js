const logger = require('../utils/logger.js')
const providerManager = require('../providers/ProviderManager.js')

const list = async (req, res) => {
  const { phone } = req.params

  const provider = providerManager.getProvider(phone)
  if (!provider) {
    return res.status(400).json({ message: 'Sessão não encontrada.' })
  }

  try {
    const contacts = await provider.getContacts()
    res.status(200).json(contacts)
  } catch (err) {
    logger.error(`Could not get whatsapp contacts from phone. ${err}`)
    res.status(400).json({ message: 'Não foi possível obter os contatos.' })
  }
}

const checkContact = async (req, res) => {
  const { phone } = req.params
  const { number } = req.body

  const provider = providerManager.getProvider(phone)
  if (!provider) {
    return res.status(400).json({ message: 'Sessão não encontrada.' })
  }

  try {
    const isValid = await provider.checkContact(number)
    res.status(200).json({ valid: isValid })
  } catch (err) {
    logger.error(err)
    res.status(400).json({ message: 'Erro ao verificar contato.' })
  }
}

const getProfilePicture = async (req, res) => {
  const { phone } = req.params
  const { number } = req.body

  const provider = providerManager.getProvider(phone)
  if (!provider) {
    return res.status(400).json({ message: 'Sessão não encontrada.' })
  }

  try {
    const picture = await provider.getProfilePicture(number)
    res.status(200).json({ picture })
  } catch (err) {
    logger.error(err)
    res.status(400).json({ message: 'Erro ao obter foto do perfil.' })
  }
}

module.exports = { list, checkContact, getProfilePicture }
