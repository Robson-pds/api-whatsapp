const axios = require('axios')
const FormData = require('form-data')
const mimekind = require('mime-kind')
const env = require('../../../../utils/Env.js')
const logger = require('../../../../utils/logger')
const verifyToken = require('../helpers/verifyToken')

const BASE_URL = env.WABA_BASE_URL
const VERSION = env.WABA_GRAPH_VERSION

const uploadMedia = async (file, sessionId) => {
  const mimeType = await mimekind.async(file)
  const formData = new FormData()
  const buffer = Buffer.from(file)
  formData.append('messaging_product', 'whatsapp')
  formData.append('file', buffer, {
    filename: 'file',
    contentType: mimeType.mime,
  })

  try {
    const sessionData = await verifyToken(sessionId)
    if (!sessionData) return

    const url = `${BASE_URL}/${VERSION}/${sessionData.phoneNumberId}/media`
    const { data } = await axios.post(url, formData, {
      headers: {
        Authorization: `Bearer ${sessionData.token}`,
        ...formData.getHeaders(),
      },
    })

    return data.id
  } catch (error) {
    logger.error(error)
  }
}

module.exports = uploadMedia
