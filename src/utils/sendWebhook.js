const axios = require('axios')
const env = require('./Env.js')
const logger = require('./logger.js')

const sendWebhook = async (webhookUrl, data) => {
  try {
    await axios.post(webhookUrl, data, {
      headers: {
        'api-token': env.API_KEY,
      },
    })
  } catch (error) {
    logger.error(error)
  }
}

module.exports = sendWebhook
