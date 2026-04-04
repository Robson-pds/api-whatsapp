const fs = require('fs')
const sleep = require('../utils/sleep.js')
const providerManager = require('../providers/ProviderManager.js')

const index = async (_, res) => {
  const sessions = fs.readdirSync('data/connections')
  const sessionsList = []

  if (sessions.length > 0) {
    sessions.forEach((session) => {
      if (session !== '.gitignore') {
        const file = fs.readFileSync(`data/connections/${session}`, 'utf8')
        const sessionData = JSON.parse(file)
        sessionsList.push(sessionData)
      }
    })
  }

  res.status(200).json({ sessions: sessionsList })
}

const store = async (req, res) => {
  const { phone, channel = 'whaileys', webhooks } = req.body

  const provider = providerManager.getProvider(phone)
  if (provider) {
    const qr = provider.getQR(phone)
    return res.status(200).json({
      status: 'CONNECTED',
      qr,
    })
  }

  fs.writeFileSync(
    `data/connections/${phone}.json`,
    JSON.stringify({ phone, channel, webhooks }),
  )

  const newProvider = await providerManager.createProvider(
    phone,
    channel,
    webhooks,
  )
  await sleep(1)
  const qr = newProvider.getQR(phone)
  return res.status(201).json({
    message: 'Sessão criada com sucesso',
    qr,
  })
}

const remove = async (req, res) => {
  const { phone } = req.body

  await providerManager.removeProvider(phone)

  res.status(200).json({ message: 'Sessão excluída com sucesso' })
}

const addWebhook = async (req, res) => {
  const { phone, webhooks, type } = req.body

  const provider = providerManager.getProvider(phone)
  if (provider) {
    await provider.addWebhook(type, webhooks)
    const path = `data/connections/${phone}.json`
    const data = JSON.parse(fs.readFileSync(path, 'utf-8'))
    data.webhooks = {
      ...data.webhooks,
      [type]: webhooks,
    }
    fs.writeFileSync(path, JSON.stringify(data), { flag: 'w' })
  }

  res.status(200).json({ message: 'Webhook adicionado com sucesso' })
}

module.exports = { index, store, addWebhook, remove }
