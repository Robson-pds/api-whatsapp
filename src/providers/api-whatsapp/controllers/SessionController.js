const fs = require('fs')
const {
  enableSubscriptionsWebhook,
  getAccessToken,
  registerPhoneNumber,
} = require('../lib/graphAPI.js')
const logger = require('../utils/logger.js')
const slugfy = require('../../../utils/slugfy.js')

const ensureSessionsDir = () => {
  if (!fs.existsSync('sessions')) fs.mkdirSync('sessions')
}

const status = async (req, res) => {
  const { sessionId } = req.params

  ensureSessionsDir()

  const sessions = fs.readdirSync('sessions')

  if (sessions.length === 0) {
    return res.status(200).json({ status: 'UNKNOWN' })
  }

  const session = sessions.find((s) => s.includes(sessionId))

  if (!session) {
    return res.status(200).json({ status: 'UNKNOWN' })
  }

  return res.status(200).json({ status: 'CONNECTED', qrcode: null })
}

const store = async (req, res) => {
  const sessionData = req.body

  ensureSessionsDir()

  const accessToken = await getAccessToken(sessionData.code)

  if (!accessToken) {
    return res.status(400).json({ status: 'UNKNOWN' })
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

  const sessionNameSlug = slugfy(sessionData.sessionName)
  fs.writeFileSync(
    `sessions/${sessionNameSlug}_${+sessionData.sessionId}.json`,
    JSON.stringify(data),
  )

  const response = {
    session: accessToken,
    status: 'CONNECTED',
    phone: responseHook?.displayPhoneNumber?.replace(/\D/g, ''),
    metaId: responseHook?.phoneNumberId,
    wabaId: sessionData.wabaId,
  }

  return res.status(200).json(response)
}

const remove = async (req, res) => {
  const { sessionId, sessionName } = req.body

  ensureSessionsDir()

  const sessionNameSlug = slugfy(sessionName)
  await fs.promises.unlink(`sessions/${sessionNameSlug}_${+sessionId}.json`)

  logger.info(`WhatsApp ${sessionName} desconectado.`)

  return res.status(200).json({ message: 'Sessão excluída com sucesso' })
}

module.exports = { status, store, remove }
