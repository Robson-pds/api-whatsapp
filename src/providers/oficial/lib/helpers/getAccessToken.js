const axios = require('axios')
const { AxiosError } = require('axios')
const env = require('../../../../utils/Env.js')
const logger = require('../../../../utils/logger.js')

const BASE_URL = env.WABA_BASE_URL
const VERSION = env.WABA_GRAPH_VERSION

const getAccessToken = async (metaCode) => {
  try {
    const url = `${BASE_URL}/${VERSION}/oauth/access_token`
    const clientId = env.WABA_APP_CLIENT_ID
    const clientSecret = env.WABA_APP_CLIENT_SECRET

    const { data } = await axios.get(
      `${url}?client_id=${clientId}&client_secret=${clientSecret}&code=${metaCode}`,
    )

    return data?.access_token
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error(error)
    }
  }
}

module.exports = getAccessToken
