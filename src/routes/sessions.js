const { Router } = require('express')
const SessionController = require('../controllers/SessionController.js')
const isAuth = require('../middleware/isAuth.js')
const channelMiddleware = require('../middleware/channel.js')
const validateData = require('../middleware/validateData.js')
const SessionSchemas = require('../schemas/Controller/sessionSchemas.js')
const registry = require('../docs/registry.js')
const { z } = require('../lib/zod.js')
const { responseMessageSchema } = require('../schemas/docs/responseMessage')

const sessionRoutes = Router()

sessionRoutes.get('/', isAuth, SessionController.index)

registry.registerPath({
  method: 'get',
  path: '/sessions',
  tags: ['Sessions'],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Lista de sessões',
      content: {
        'application/json': {
          schema: z
            .array(
              z.object({
                phone: z.string(),
              }),
            )
            .openapi({ example: [{ phone: '5599999999999' }] }),
        },
      },
    },
  },
})
registry.register(
  'sessionIndexSchema',
  z.array(
    z.object({
      phone: z.string(),
    }),
  ),
)

sessionRoutes.post(
  '/start',
  isAuth,
  validateData(SessionSchemas.createSessionSchema),
  SessionController.store,
)

registry.registerPath({
  method: 'post',
  path: '/sessions/start',
  tags: ['Sessions'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            phone: z.string().openapi({
              description:
                'Número de telefone com código do país (12-13 dígitos)',
              example: '5599999999999',
            }),
            channel: z.enum(['whaileys', 'oficial']).openapi({
              description:
                'Provedor WhatsApp: whaileys (Baileys/Não-oficial) ou oficial (WABA/API Oficial)',
              example: 'whaileys',
            }),
            webhooks: z
              .object({
                receiveMessage: z.string().url().optional(),
              })
              .optional()
              .openapi({
                description:
                  'URLs de webhooks para receber mensagens e eventos',
              }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Sessão retornada com sucesso',
      content: {
        'application/json': {
          schema: z
            .object({
              status: z.int(),
              qr: z.string(),
            })
            .openapi({ example: { status: 1, qr: 'codigo qrcode' } }),
        },
      },
    },
    201: {
      description: 'Sessão criada com sucesso',
      content: {
        'application/json': {
          schema: z
            .object({
              message: z.string(),
              qr: z.string(),
            })
            .openapi({
              example: {
                message: 'Sessão criada com sucesso',
                qr: 'codigo qrcode',
              },
            }),
        },
      },
    },
  },
})
registry.register('createSessionSchema', SessionSchemas.createSessionSchema)
registry.register(
  'createSessionResponseSchema',
  z.object({
    message: z.string(),
    qr: z.string(),
  }),
)

sessionRoutes.post(
  '/add-webhook',
  isAuth,
  channelMiddleware,
  validateData(SessionSchemas.addWebhookSchema),
  SessionController.addWebhook,
)

registry.registerPath({
  method: 'post',
  path: '/sessions/add-webhook',
  tags: ['Sessions'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: SessionSchemas.addWebhookSchema,
        },
      },
    },
    parameters: [
      {
        name: 'channel',
        in: 'header',
        description:
          'Provedor WhatsApp: whaileys ou oficial (opcional, pode estar em header, query ou body)',
        schema: {
          type: 'string',
          enum: ['whaileys', 'oficial'],
          example: 'whaileys',
        },
      },
    ],
  },
  responses: {
    200: {
      description: 'Webhook adicionado com sucesso',
      content: {
        'application/json': {
          schema: responseMessageSchema.openapi({
            example: { message: 'Webhook adicionado com sucesso' },
          }),
        },
      },
    },
  },
})
registry.register('addWebhookSchema', SessionSchemas.addWebhookSchema)

sessionRoutes.delete(
  '/remove',
  isAuth,
  validateData(SessionSchemas.deleteSessionSchema),
  SessionController.remove,
)

registry.registerPath({
  method: 'delete',
  path: '/sessions/remove',
  tags: ['Sessions'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: SessionSchemas.deleteSessionSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Sessão excluída com sucesso',
      content: {
        'application/json': {
          schema: responseMessageSchema.openapi({
            example: { message: 'Sessão excluída com sucesso' },
          }),
        },
      },
    },
  },
})
registry.register('deleteSessionSchema', SessionSchemas.deleteSessionSchema)

module.exports = sessionRoutes
