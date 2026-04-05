const axios = require('axios')
const { AxiosError } = require('axios')
const env = require('../../../../utils/Env.js')
const logger = require('../../../../utils/logger.js')

const BASE_URL = env.WABA_BASE_URL
const VERSION = env.WABA_GRAPH_VERSION

const getPhoneNumberId = async (wabaId, token) => {
  try {
    const url = `${BASE_URL}/${VERSION}/${wabaId}/phone_numbers`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!data.data[0]) {
      logger.error("Erro ao obter ID do número de telefone");
      return null;
    }

    const verifiedName = data.data[0].verified_name;
    const displayPhoneNumber = data.data[0].display_phone_number;
    logger.info(`WhatsApp ${verifiedName} - (${displayPhoneNumber}) conectado`);

    return { phoneNumberId: data.data[0].id, displayPhoneNumber };
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error(error);
    }
  }
};

module.exports = getPhoneNumberId
