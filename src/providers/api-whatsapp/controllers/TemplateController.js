const {
  createTemplate,
  deleteTemplate,
  getTemplates,
  uploadTemplate,
} = require('../lib/graphAPI.js')
const logger = require('../utils/logger.js')

const index = async (req, res) => {
  const { sessionId } = req.params

  const response = await getTemplates(sessionId)

  return res.status(200).json(response)
}

const store = async (req, res) => {
  const { sessionId } = req.params
  const template = req.body

  try {
    const response = await createTemplate(sessionId, template)
    return res.status(200).json(response)
  } catch (error) {
    logger.error(error, 'Erro ao criar o template')
    return res.status(400).json({ error: 'Erro ao criar o template' })
  }
}

const upload = async (req, res) => {
  const { sessionId } = req.params
  const { path, filename, fileLength, fileType } = req.body

  try {
    const response = await uploadTemplate(
      path,
      filename,
      fileLength,
      fileType,
      sessionId,
    )
    return res.status(200).json(response)
  } catch (error) {
    logger.error(`Erro ao fazer upload do template: ${error}`)
    return res.status(400).json({ error: 'Erro ao fazer upload do template' })
  }
}

const remove = async (req, res) => {
  const { sessionId, templateName } = req.params

  try {
    const response = await deleteTemplate(templateName, sessionId)
    return res.status(200).json(response)
  } catch (error) {
    logger.error(`Erro ao remover o template: ${error}`)
    return res.status(400).json({ error: 'Erro ao remover o template' })
  }
}

module.exports = { index, store, upload, remove }
