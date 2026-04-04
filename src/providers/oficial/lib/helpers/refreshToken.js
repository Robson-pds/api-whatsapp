const axios = require('axios')
const env = require('../../../../utils/Env.js')
const logger = require('../../../../utils/logger.js')

const { isAxiosError } = axios

const refreshToken = async (currentToken) => {
  try {
    const url = `https://graph.instagram.com/oauth/access_token`

    const params = {
      client_id: env.WABA_APP_CLIENT_ID,
      client_secret: env.WABA_APP_CLIENT_SECRET,
      access_token: currentToken,
      grant_type: 'refresh_access_token',
    }

    const { data } = await axios.get(url, { params })

    logger.info('Token refreshed successfully')
    return data
  } catch (error) {
    if (isAxiosError(error)) {
      const errorData = error.response?.data
      logger.error(errorData, 'Erro ao renovar token no Graph API')
    } else {
      logger.error(error, 'Erro desconhecido ao renovar token')
    }
    throw error
  }
}

module.exports = refreshToken
