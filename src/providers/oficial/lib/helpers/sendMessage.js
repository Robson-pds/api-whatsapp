const axios = require('axios')
const env = require('../../../../utils/Env.js')
const logger = require('../../../../utils/logger')
const verifyToken = require('../helpers/verifyToken')

const { isAxiosError } = axios

const BASE_URL = env.WABA_BASE_URL
const VERSION = env.WABA_GRAPH_VERSION

const sendMessage = async (number, options, sessionId) => {
  const messageData = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: number,
    ...options,
  }

  try {
    const sessionData = await verifyToken(sessionId)
    if (!sessionData) return

    const url = `${BASE_URL}/${VERSION}/${sessionData.phoneNumberId}/messages`
    const { data } = await axios.post(url, messageData, {
      headers: {
        Authorization: `Bearer ${sessionData.token}`,
      },
    })

    return data
  } catch (error) {
    if (isAxiosError(error)) {
      const errorData = error.response?.data?.error
      logger.error(errorData, 'Erro da API do WhatsApp ao enviar mensagem.')
    } else {
      logger.error(error, 'Erro desconhecido ao enviar mensagem.')
    }
  }
}

module.exports = sendMessage
