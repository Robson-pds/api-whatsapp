const providerManager = require('../providers/ProviderManager.js')

const sendTextMedia = async (req, res) => {
  const { phone } = req.params
  const { number, message = '', template } = req.body
  const media = req.files

  const provider = providerManager.getProvider(phone)
  if (!provider) {
    return res.status(400).json({ message: 'Sessão não encontrada.' })
  }

  try {
    if (template) {
      await provider.sendTemplate(number, template)
    } else {
      let content
      if (media) {
        content = await provider.prepareMediaContent(media.file, message)
        await provider.sendMedia(number, content)
      } else {
        await provider.sendText(number, message)
      }
    }

    res.status(200).json({ message: 'Mensagem enviada com sucesso' })
  } catch (error) {
    res.status(400).json({ message: 'Erro ao enviar mensagem' })
  }
}

const unreadMessages = async (req, res) => {
  const { phone } = req.params

  try {
    const provider = providerManager.getProvider(phone)
    if (!provider) {
      return res.status(400).json({ message: 'Sessão não encontrada.' })
    }

    const messages = await provider.getUnreadMessages()

    res.status(200).json(messages)
  } catch (error) {
    console.error(error)
    res.status(400).json({ message: 'Erro ao obter mensagens' })
  }
}

module.exports = { sendTextMedia, unreadMessages }
