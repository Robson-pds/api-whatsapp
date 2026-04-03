const axios = require('axios')
const mimekind = require('mime-kind')
const env = require('../../../utils/Env.js')
const { generateNumbers } = require('../utils/generateNumbers')
const logger = require('../utils/logger')
const verifyToken = require('./helpers/verifyToken')

const { AxiosError, isAxiosError } = axios

const BASE_URL = env.WABA_BASE_URL
const VERSION = env.WABA_GRAPH_VERSION

exports.getAccessToken = async (metaCode) => {
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

exports.enableSubscriptionsWebhook = async (wabaId, token) => {
  try {
    const url = `${BASE_URL}/${VERSION}/${wabaId}/subscribed_apps`
    const { data } = await axios.post(
      url,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    )

    if (data.success) {
      logger.info('Webhook ativado com sucesso!')
      const phoneNumberId = await exports.getPhoneNumberId(wabaId, token)

      return phoneNumberId
    }
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error(error)
    }
  }
}

exports.getPhoneNumberId = async (wabaId, token) => {
  try {
    const url = `${BASE_URL}/${VERSION}/${wabaId}/phone_numbers`
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const verifiedName = data.data[0].verified_name
    const displayPhoneNumber = data.data[0].display_phone_number
    logger.info(`WhatsApp ${verifiedName} - (${displayPhoneNumber}) conectado`)

    return { phoneNumberId: data.data[0].id, displayPhoneNumber }
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error(error)
    }
  }
}

exports.registerPhoneNumber = async (phoneNumberId, token) => {
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

exports.sendMessage = async (number, options, sessionId) => {
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

exports.markMessages = async (messageId, sessionId) => {
  const data = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  }

  try {
    const sessionData = await verifyToken(sessionId)
    if (!sessionData) return

    const url = `${BASE_URL}/${VERSION}/${sessionData.phoneNumberId}/messages`

    await axios.post(url, data, {
      headers: { Authorization: `Bearer ${sessionData.token}` },
    })
  } catch (error) {
    if (isAxiosError(error)) {
      const errorData = error.response?.data?.error
      logger.error(errorData, 'Erro da API do WhatsApp ao marcar mensagem.')
    } else {
      logger.error(error, 'Erro desconhecido ao marcar mensagem.')
    }
  }
}

exports.uploadMedia = async (file, sessionId) => {
  const mimeType = await mimekind.async(file)
  const formData = new FormData()
  const buffer = Buffer.from(file)
  formData.append('messaging_product', 'whatsapp')
  formData.append('file', new Blob([buffer], { type: mimeType.mime }))

  try {
    const sessionData = await verifyToken(sessionId)
    if (!sessionData) return

    const url = `${BASE_URL}/${VERSION}/${sessionData.phoneNumberId}/media`
    const { data } = await axios.post(url, formData, {
      headers: {
        Authorization: `Bearer ${sessionData.token}`,
        'Content-Type': 'multipart/form-data',
      },
    })

    return data.id
  } catch (error) {
    logger.error(error)
  }
}

exports.getTemplates = async (sessionId) => {
  try {
    const sessionData = await verifyToken(sessionId)
    if (!sessionData) return

    const url = `${BASE_URL}/${VERSION}/${sessionData.whatsappAccountId}/message_templates`
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${sessionData.token}` },
    })

    return data.data
  } catch (error) {
    logger.error(error)
  }
}

exports.deleteTemplate = async (templateName, sessionId) => {
  try {
    const sessionData = await verifyToken(sessionId)
    if (!sessionData) return

    const url = `${BASE_URL}/${VERSION}/${sessionData.whatsappAccountId}/message_templates?name=${templateName}`
    await axios.delete(url, {
      headers: { Authorization: `Bearer ${sessionData.token}` },
    })
  } catch (error) {
    logger.error(error)
  }
}

exports.deRegisterPhoneNumber = async (sessionId) => {
  try {
    const sessionData = await verifyToken(sessionId)
    if (!sessionData) return

    const url = `${BASE_URL}/${VERSION}/${sessionData.phoneNumberId}/deregister`
    await axios.post(
      url,
      {},
      { headers: { Authorization: `Bearer ${sessionData.token}` } },
    )
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error(error)
    }
  }
}

exports.refreshToken = async (token) => {
  try {
    const clientId = env.WABA_APP_CLIENT_ID
    const clientSecret = env.WABA_APP_CLIENT_SECRET
    const url = `${BASE_URL}/${VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&set_token_expires_in_60_days=true&fb_exchange_token=${token}`

    const { data } = await axios.get(url)

    return data
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error(error.message)
    }
  }
}

exports.createTemplate = async (sessionId, templateData) => {
  try {
    const sessionData = await verifyToken(sessionId)
    if (!sessionData) return

    const url = `${BASE_URL}/${VERSION}/${sessionData.whatsappAccountId}/message_templates`
    const { data } = await axios.post(url, templateData, {
      headers: { Authorization: `Bearer ${sessionData.token}` },
    })

    return data
  } catch (error) {
    if (isAxiosError(error)) {
      const errorData = error.response?.data?.error
      logger.error(errorData, 'Erro da API do WhatsApp ao criar template.')
    } else {
      logger.error(error, 'Erro desconhecido ao criar template.')
    }
  }
}

exports.uploadTemplate = async (
  path,
  filename,
  fileLength,
  fileType,
  sessionId,
) => {
  try {
    const sessionData = await verifyToken(sessionId)
    if (!sessionData) return

    const clientId = env.WABA_APP_CLIENT_ID
    const url = `${BASE_URL}/${VERSION}/${clientId}/uploads`

    const { data } = await axios.post(
      url,
      {
        file_name: filename,
        file_length: fileLength,
        file_type: fileType,
      },
      {
        headers: { Authorization: `Bearer ${sessionData.token}` },
      },
    )

    if (data?.id) {
      const { data: file } = await axios.get(path, {
        responseType: 'arraybuffer',
      })
      const formData = new FormData()
      formData.append('file', file)

      const uploadUrl = `${BASE_URL}/${VERSION}/${data.id}`
      const { data: uploadData } = await axios.post(uploadUrl, formData, {
        headers: {
          Authorization: `Bearer ${sessionData.token}`,
          file_offset: 0,
        },
      })

      return uploadData.h
    }
  } catch (error) {
    if (isAxiosError(error)) {
      const errorData = error.response?.data?.error
      logger.error(errorData, 'Erro da API do WhatsApp ao fazer upload.')
    } else {
      logger.error(error, 'Erro desconhecido ao fazer upload.')
    }
  }
}
