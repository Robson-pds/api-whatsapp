const { z } = require('../../lib/zod.js')

const fileSchema = z.object({
  name: z.string(),
  data: z.any(),
  mimetype: z.string(),
  md5: z.string(),
  size: z.number(),
})

const sendMediaSchema = z.object({
  number: z.string(),
  file: fileSchema,
  message: z.string().optional(),
})

const sendTextSchema = z.object({
  number: z.string(),
  message: z.string().min(1),
})

const sendTemplateSchema = z.object({
  number: z.string(),
  template: z.object({
    name: z.string(),
    language: z.object({
      code: z.string(),
    }),
    components: z.array(z.any()).optional(),
  }),
})

const sendMessageSchema = z.union([
  sendTextSchema,
  sendMediaSchema,
  sendTemplateSchema,
])

module.exports = {
  sendMessageSchema,
  sendTextSchema,
  sendMediaSchema,
  sendTemplateSchema,
}
