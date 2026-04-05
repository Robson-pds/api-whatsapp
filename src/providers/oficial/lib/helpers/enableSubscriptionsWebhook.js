const axios = require('axios')
const { AxiosError } = require('axios')
const env = require('../../../../utils/Env.js')
const logger = require('../../../../utils/logger.js')

const BASE_URL = env.WABA_BASE_URL
const VERSION = env.WABA_GRAPH_VERSION

const getPhoneNumberId = require('./getPhoneNumberId.js')

const enableSubscriptionsWebhook = async (
  wabaId,
  token
) => {
  try {
    const url = `${BASE_URL}/${VERSION}/${wabaId}/subscribed_apps`;
    const { data } = await axios.post(
      url,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (data.success) {
      logger.info("Webhook ativado com sucesso!");
      const phoneNumberId = await getPhoneNumberId(wabaId, token);

      if (!phoneNumberId) {
        logger.error("Erro ao obter ID do número de telefone");
        return null;
      }

      return phoneNumberId;
    }
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error(error);
    }
  }
};

module.exports = enableSubscriptionsWebhook
