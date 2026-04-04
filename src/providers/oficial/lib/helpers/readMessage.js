const axios = require('axios')
const verifyToken = require('../helpers/verifyToken')
const env = require('../../../../utils/Env.js')
const logger = require('../../../../utils/logger')

const { isAxiosError } = axios

const BASE_URL = env.WABA_BASE_URL
const VERSION = env.WABA_GRAPH_VERSION

const markMessages = async (messageId, sessionId) => {
  const data = {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId
  };

  try {
    const sessionData = await verifyToken(sessionId);
    if (!sessionData) return;

    const url = `${BASE_URL}/${VERSION}/${sessionData.phoneNumberId}/messages`;

    await axios.post(url, data, {
      headers: { Authorization: `Bearer ${sessionData.token}` }
    });
  } catch (error) {
    if (isAxiosError(error)) {
      const errorData = error.response?.data.error;
      logger.error(errorData, "Erro da API do WhatsApp ao marcar mensagem.");
    } else {
      logger.error(error, "Erro desconhecido ao marcar mensagem.");
    }
  }
};

module.exports = markMessages