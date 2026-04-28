const express = require('express')
const registry = require('../docs/registry.js')
const readMessages = require('../controllers/ChatController.js')
const isAuth = require('../middleware/isAuth.js')
const channelMiddleware = require('../middleware/channel.js')
const validateData = require('../middleware/validateData.js')
const ChatSchemasSchemas = require('../schemas/Controller/chatSchemas.js')
const { responseMessageSchema } = require('../schemas/docs/responseMessage')
const { z } = require('../lib/zod.js')

const chatsRoutes = express.Router()

const channelParameters = [
  {
    name: 'channel',
    in: 'header',
    description:
      'Provedor WhatsApp (padrão: whaileys). Aceita também header x-channel, query channel e (em POST) body.channel.',
    schema: {
      type: 'string',
      enum: ['whaileys', 'oficial'],
      example: 'whaileys',
    },
  },
  {
    name: 'x-channel',
    in: 'header',
    description:
      'Alias para o header channel. Provedor WhatsApp (padrão: whaileys).',
    schema: {
      type: 'string',
      enum: ['whaileys', 'oficial'],
      example: 'whaileys',
    },
  },
  {
    name: 'channel',
    in: 'query',
    description: 'Provedor WhatsApp via querystring (padrão: whaileys).',
    schema: {
      type: 'string',
      enum: ['whaileys', 'oficial'],
      example: 'whaileys',
    },
  },
]

chatsRoutes.post(
  '/:phone/read',
  isAuth,
  channelMiddleware,
  validateData(ChatSchemasSchemas.readMessagesSchema),
  readMessages,
)

registry.registerPath({
  method: 'post',
  path: '/chats/{phone}/read',
  tags: ['Chats'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      phone: z.string().openapi({ example: '5599999999999' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: ChatSchemasSchemas.readMessagesSchema,
        },
      },
    },
    parameters: channelParameters,
  },
  responses: {
    200: {
      description: 'Mensagens lidas com sucesso',
      content: {
        'application/json': {
          schema: responseMessageSchema.openapi({
            example: { message: 'Mensagens lidas com sucesso' },
          }),
        },
      },
    },
    400: {
      description: 'Erro ao ler mensagens',
      content: {
        'application/json': {
          schema: responseMessageSchema.openapi({
            example: { message: 'Erro ao ler mensagens' },
          }),
        },
      },
    },
    404: {
      description: 'remoteJid invalido',
      content: {
        'application/json': {
          schema: responseMessageSchema.openapi({
            example: { message: 'remoteJid invalido' },
          }),
        },
      },
    },
  },
})
registry.register('readMessagesSchema', ChatSchemasSchemas.readMessagesSchema)

module.exports = chatsRoutes
