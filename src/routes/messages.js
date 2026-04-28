const express = require('express')
const MessageController = require('../controllers/MessageController.js')
const isAuth = require('../middleware/isAuth.js')
const channelMiddleware = require('../middleware/channel.js')
const validateData = require('../middleware/validateData.js')
const MessageSchemas = require('../schemas/Controller/messageSchemas.js')
const {
  prepareMessageResponseSchema,
} = require('../schemas/docs/preparemessageSchemas.js')
const { responseMessageSchema } = require('../schemas/docs/responseMessage.js')
const registry = require('../docs/registry.js')
const { z } = require('../lib/zod.js')

const messageRoutes = express.Router()

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

messageRoutes.post(
  '/:phone',
  isAuth,
  channelMiddleware,
  validateData(MessageSchemas.sendMessageSchema),
  MessageController.sendTextMedia,
)

registry.registerPath({
  method: 'post',
  path: '/messages/{phone}',
  tags: ['Messages'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      phone: z.string().openapi({ example: '5599999999999' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: z.union([
            MessageSchemas.sendTextSchema,
            MessageSchemas.sendTemplateSchema,
          ]),
        },
        'multipart/form-data': {
          schema: MessageSchemas.sendMediaSchema,
        },
      },
    },
    parameters: channelParameters,
  },
  responses: {
    200: {
      description: 'Mensagem enviada com sucesso',
      content: {
        'application/json': {
          schema: responseMessageSchema.openapi({
            example: { message: 'Mensagem enviada com sucesso' },
          }),
        },
      },
    },
    400: {
      description: 'Erro ao enviar mensagem de mídia',
      content: {
        'application/json': {
          schema: responseMessageSchema.openapi({
            example: { message: 'Erro ao enviar mensagem de mídia' },
          }),
        },
      },
    },
  },
})
registry.register('sendTextSchema', MessageSchemas.sendTextSchema)
registry.register('sendMediaSchema', MessageSchemas.sendMediaSchema)
registry.register('sendTemplateSchema', MessageSchemas.sendTemplateSchema)

messageRoutes.get(
  '/:phone/unread',
  isAuth,
  channelMiddleware,
  MessageController.unreadMessages,
)

registry.registerPath({
  method: 'get',
  path: '/messages/{phone}/unread',
  tags: ['Messages'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      phone: z.string().openapi({ example: '5599999999999' }),
    }),
    parameters: channelParameters,
  },
  responses: {
    200: {
      description:
        'Lista de mensagens não lidas. Observação: no channel=oficial este endpoint não é suportado.',
      content: {
        'application/json': {
          schema: z.array(prepareMessageResponseSchema),
        },
      },
    },
    400: {
      description: 'Erro ao obter mensagens',
      content: {
        'application/json': {
          schema: responseMessageSchema.openapi({
            example: { message: 'Erro ao obter mensagens' },
          }),
        },
      },
    },
  },
})

module.exports = messageRoutes
