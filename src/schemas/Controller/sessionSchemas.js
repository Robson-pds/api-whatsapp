const { z } = require('../../lib/zod.js')

const createSessionSchema = z
  .object({
    phone: z
      .string()
      .min(12, 'Minimo de 12 digitos para o phone')
      .max(13, 'Maximo de 13 digitos o phone'),
    channel: z.enum(['whaileys', 'oficial']).default('whaileys'),
    webhooks: z
      .object({
        webhook: z.string().url().optional(),
      })
      .optional(),
  })
  .openapi({
    example: {
      phone: '5599999999999',
      channel: 'whaileys',
      webhooks: {
        receiveMessage: 'https://example.com/webhook',
      },
    },
  })

const deleteSessionSchema = z.object({
  phone: z
    .string()
    .min(12, 'Minimo de 12 digitos para o phone')
    .max(13, 'Maximo de 13 digitos o phone'),
})

const addWebhookSchema = z.object({
  phone: z
    .string()
    .min(12, 'Minimo de 12 digitos para o phone')
    .max(13, 'Maximo de 13 digitos o phone'),
  webhooks: z.string().url(),
  type: z.string(),
})

module.exports = { createSessionSchema, deleteSessionSchema, addWebhookSchema }
