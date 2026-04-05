const axios = require('axios')
const { AxiosError } = require('axios')
const env = require('../../../../utils/Env.js')
const logger = require('../../../../utils/logger.js')
const generateNumbers = require('../../../../utils/generateNumbers.js')

const BASE_URL = env.WABA_BASE_URL
const VERSION = env.WABA_GRAPH_VERSION

const registerPhoneNumber = async (phoneNumberId, token) => {
  try {
    const url = `${BASE_URL}/${VERSION}/${phoneNumberId}/register`
    const pin = generateNumbers()
    const { data } = await axios.post(
      url,
      { messaging_product: 'whatsapp', pin },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    if (data.success) {
      return pin
    }
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error(error)
    }
  }
}

module.exports = registerPhoneNumber
