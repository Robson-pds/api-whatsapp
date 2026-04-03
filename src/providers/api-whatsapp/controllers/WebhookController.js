const axios = require('axios')
const fs = require('fs')
const logger = require('../utils/logger.js')

const ensureSessionsDir = () => {
  if (!fs.existsSync('sessions')) fs.mkdirSync('sessions')
}

const getSessionData = (sessionId) => {
  ensureSessionsDir()

  const sessions = fs.readdirSync('sessions')
  const id = String(sessionId ?? '')
  const numericSuffix = `_${Number(sessionId)}.json`

  const sessionFile =
    sessions.find((file) => file.endsWith(numericSuffix)) ||
    sessions.find((file) => file.includes(id))

  if (!sessionFile) return null

  try {
    const file = fs.readFileSync(`sessions/${sessionFile}`, 'utf8')
    return JSON.parse(file)
  } catch {
    return null
  }
}

const fetchWebHook = (sessionId, listener) => {
  const sessionData = getSessionData(sessionId)
  if (!sessionData) return null

  const webhooks = sessionData.webhooks

  let webhookUrl
  if (typeof webhooks === 'string') webhookUrl = webhooks
  else if (Array.isArray(webhooks)) webhookUrl = webhooks[0]
  else if (webhooks && typeof webhooks === 'object') {
    webhookUrl =
      webhooks[listener] ||
      webhooks[listener?.replace?.(/\./g, '_')] ||
      webhooks.default
  }

  return { webhookUrl, sessionKey: sessionData.sessionKey }
}

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

const receivedWebhook = async (req, res) => {
  const { message, sessionName, sessionId } = req.body
  res.status(200).json()

  const [changes] = message?.changes || []
  const changeKeys = Object.keys(changes?.value || {})
  let response
  let listener = 'messages.upsert'

  if (changeKeys.includes('statuses')) {
    const [statuses] = changes.value.statuses
    const status = {
      sent: 2,
      delivered: 3,
      read: 4,
    }

    response = {
      id: statuses.id,
      update: { status: status[statuses.status] },
    }
    listener = 'messages.update'
  }

  if (changeKeys.includes('message_echoes')) {
    const [messageEchoes] = changes.value.message_echoes
    const contact = {
      wa_id: messageEchoes.to,
    }

    response = prepareMessageData({
      message: { ...messageEchoes, fromMe: true, unreadMessages: 0 },
      contact,
      sessionId,
    })
  }

  if (changeKeys.includes('messages')) {
    const [messages] = changes.value.messages
    const [contacts] = changes.value.contacts

    if (messages?.context) {
      messages.context.message_id = messages.context.id
    }

    response = prepareMessageData({
      message: messages,
      contact: contacts,
      sessionId,
    })
  }

  const data = fetchWebHook(sessionId, listener)

  if (!data?.webhookUrl || !data.sessionKey) {
    const errorMessage = `Webhook ${listener} não configurado para a sessão ${sessionName}`
    logger.error(errorMessage)
    return
  }

  try {
    await axios.post(data.webhookUrl, {
      listener,
      sessionId,
      sessionKey: data.sessionKey,
      messages: JSON.stringify([response]),
    })
  } catch (error) {
    logger.error(`Erro ao comunicar com o backend. ${error}`)
  }
}

module.exports = { receivedWebhook }
