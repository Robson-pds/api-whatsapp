const { sendMessage, uploadMedia } = require('../lib/graphAPI.js')
const logger = require('../utils/logger.js')

const isValidUrl = (value) => {
  try {
    const parsedUrl = new URL(value)
    return Boolean(parsedUrl)
  } catch {
    return false
  }
}

const formatNumber = (value) => String(value || '').replace(/\D/g, '')

const prepareMessageData = ({ message, contact, sessionId, ...extra }) => {
  const now = Math.floor(Date.now() / 1000)
  return {
    sessionId,
    contact,
    message: {
      timestamp: message?.timestamp ?? now,
      ...message,
    },
    ...extra,
  }
}

const sendText = async (req, res) => {
  const { sessionId } = req.params
  const { number, message: body, quoted } = req.body

  const options = {
    type: 'text',
    text: {
      preview_url: isValidUrl(body),
      body,
    },
  }

  if (quoted?.key?.id) {
    options.context = {
      message_id: quoted.key.id,
    }
  }

  const sentMessage = await sendMessage(number, options, sessionId)
  const messageData = {
    id: sentMessage?.messages?.[0]?.id,
    fromMe: true,
    timestamp: new Date().getTime() / 1000,
    ...options,
  }
  const contactData = { wa_id: number }

  const response = prepareMessageData({
    message: messageData,
    contact: contactData,
    sessionId,
  })

  return res.status(200).json({ message: response })
}

const sendMedia = async (req, res) => {
  const {
    number,
    file,
    type: bodyType,
    caption: bodyCaption,
    message,
  } = req.body
  const media = req.files
  const sessionId =
    req.body.sessionId || req.params.sessionId || req.params.phone

  try {
    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId é obrigatório' })
    }

    if (media?.file) {
      const fileUpload = media.file
      const caption = bodyCaption ?? message ?? ''

      const mediaId = await uploadMedia(fileUpload.data, sessionId)
      if (!mediaId) {
        return res
          .status(400)
          .json({ message: 'Erro ao enviar mensagem de mídia' })
      }

      const mime = fileUpload.mimetype || ''
      let type = 'document'
      if (mime.startsWith('image/')) type = 'image'
      else if (mime.startsWith('video/')) type = 'video'
      else if (mime.startsWith('audio/')) type = 'audio'

      const payload = { id: mediaId }
      if (type === 'document') payload.filename = fileUpload.name
      if (type !== 'audio' && caption) payload.caption = caption

      await sendMessage(number, { type, [type]: payload }, sessionId)
      return res.status(200).json()
    }

    const fileData = typeof file === 'string' ? JSON.parse(file) : file
    const type = bodyType
    const caption = bodyCaption
    const options = {
      type,
      [type]: { link: fileData.url, caption },
    }

    if (type === 'document' && options.document) {
      options.document.filename = fileData.originalName
    }

    if (type === 'audio' && options.audio) {
      logger.info(`Caption junto com o audio: ${caption}`)
      options.audio = { link: fileData.url }
    }

    const sentMediaMessage = await sendMessage(number, options, sessionId)
    const messageData = {
      id: sentMediaMessage?.messages?.[0]?.id,
      fromMe: true,
      timestamp: new Date().getTime() / 1000,
      ...options,
    }
    const contactData = { wa_id: number }

    const response = prepareMessageData({
      message: messageData,
      contact: contactData,
      sessionId,
      uploadedFilename: fileData.fileName,
    })

    return res.status(200).json({ message: response })
  } catch {
    return res.status(400).json({ message: 'Erro ao enviar mensagem de mídia' })
  }
}

const sendReaction = async (req, res) => {
  const { sessionId } = req.params
  const { number, reaction } = req.body

  const options = {
    type: 'reaction',
    reaction: {
      message_id: reaction?.react?.key?.id,
      emoji: reaction?.react?.text,
    },
  }

  const sentMessage = await sendMessage(number, options, sessionId)
  const messageData = {
    id: sentMessage?.messages?.[0]?.id,
    fromMe: true,
    timestamp: new Date().getTime() / 1000,
    ...options,
  }
  const contactData = { wa_id: number }

  const response = prepareMessageData({
    message: messageData,
    contact: contactData,
    sessionId,
  })

  return res.status(200).json({ message: response })
}

const sendContact = async (req, res) => {
  const { sessionId } = req.params
  const { number, contacts: vcards } = req.body

  const contactsParse = typeof vcards === 'string' ? JSON.parse(vcards) : vcards
  const contacts = []

  for (const contact of contactsParse || []) {
    const contactName = contact.displayName
    const contactNumber = contact.vcard?.split('\n')?.[4]?.split('+')?.[1]
    const phone = formatNumber(contactNumber)

    contacts.push({
      name: { formatted_name: contactName, first_name: contactName },
      phones: [{ phone, wa_id: formatNumber(contactNumber) }],
    })
  }

  const options = { type: 'contacts', contacts }

  const sentMessage = await sendMessage(number, options, sessionId)
  const messageData = {
    id: sentMessage?.messages?.[0]?.id,
    fromMe: true,
    timestamp: new Date().getTime() / 1000,
    ...options,
  }
  const contactData = { wa_id: number }

  const response = prepareMessageData({
    message: messageData,
    contact: contactData,
    sessionId,
  })

  return res.status(200).json(response)
}

const sendTemplate = async (req, res) => {
  const { sessionId } = req.params
  const { number, template, components } = req.body

  const options = { type: 'template', template }

  const sentMessage = await sendMessage(number, options, sessionId)
  const messageData = {
    id: sentMessage?.messages?.[0]?.id,
    fromMe: true,
    timestamp: new Date().getTime() / 1000,
    ...options,
  }
  const contactData = { wa_id: number }

  const response = prepareMessageData({
    message: messageData,
    contact: contactData,
    sessionId,
    components,
  })

  return res.status(200).json({ message: response })
}

module.exports = {
  sendText,
  sendMedia,
  sendReaction,
  sendContact,
  sendTemplate,
}
