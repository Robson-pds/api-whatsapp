const { addSeconds, differenceInHours } = require('date-fns')
const fs = require('fs')
const refreshToken = require('./refreshToken')

const verifyToken = async (sessionId) => {
  const sessions = fs.readdirSync('sessions')
  const session = sessions.find((sessionItem) =>
    sessionItem.includes(sessionId),
  )

  if (!session) return null

  const path = `sessions/${session}`
  const file = fs.readFileSync(path, 'utf8')
  const sessionData = JSON.parse(file)

  const now = new Date()
  const expiresAt = new Date(sessionData.expiresAt)

  if (differenceInHours(expiresAt, now) < 48) {
    const data = await refreshToken(sessionData.token)

    sessionData.token = data.access_token
    sessionData.expiresAt = addSeconds(new Date(), data.expires_in)

    fs.writeFileSync(path, JSON.stringify(sessionData), { flag: 'w' })
  }

  return {
    token: sessionData.token,
    phoneNumberId: sessionData.phoneNumberId,
    whatsappAccountId: sessionData.whatsappAccountId,
  }
}

module.exports = verifyToken
