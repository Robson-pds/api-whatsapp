const express = require('express')
const ContactController = require('../controllers/ContactController.js')
const isAuth = require('../middleware/isAuth.js')
const channelMiddleware = require('../middleware/channel.js')
const validateData = require('../middleware/validateData.js')
const ContactSchemas = require('../schemas/Controller/contactSchemas.js')
const registry = require('../docs/registry.js')
const { z } = require('../lib/zod.js')
const { responseMessageSchema } = require('../schemas/docs/responseMessage')
const {
  responseContactSchema,
} = require('../schemas/docs/responseContactSchemas')

const contactsRoutes = express.Router()

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

contactsRoutes.get(
  '/:phone/list',
  isAuth,
  channelMiddleware,
  ContactController.list,
)

registry.registerPath({
  method: 'get',
  path: '/contacts/{phone}/list',
  tags: ['Contacts'],
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
        'Lista de contatos. Observação: no channel=oficial a API retorna uma lista vazia ([]).',
      content: {
        'application/json': {
          schema: z.array(responseContactSchema),
        },
      },
    },
    400: {
      description: 'Não foi possível obter os contatos',
      content: {
        'application/json': {
          schema: responseMessageSchema.openapi({
            example: { message: 'Não foi possível obter os contatos' },
          }),
        },
      },
    },
  },
})

contactsRoutes.post(
  '/:phone/check',
  isAuth,
  channelMiddleware,
  validateData(ContactSchemas.checkContactSchema),
  ContactController.checkContact,
)

registry.registerPath({
  method: 'post',
  path: '/contacts/{phone}/check',
  tags: ['Contacts'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      phone: z.string().openapi({ example: '5599999999999' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: ContactSchemas.checkContactSchema,
        },
      },
    },
    parameters: channelParameters,
  },
  responses: {
    200: {
      description:
        'Contato verificado com sucesso. Observação: no channel=oficial a API atualmente sempre retorna valid=true.',
      content: {
        'application/json': {
          schema: z
            .object({
              valid: z.boolean().openapi({ example: true }),
            })
            .openapi({ example: { valid: true } }),
        },
      },
    },
    400: {
      description: 'Não foi possível obter o contato.',
      content: {
        'application/json': {
          schema: responseMessageSchema.openapi({
            example: { message: 'Não foi possível obter o contato.' },
          }),
        },
      },
    },
  },
})
registry.register('checkContactSchema', ContactSchemas.checkContactSchema)

contactsRoutes.post(
  '/:phone/profile-picture',
  isAuth,
  channelMiddleware,
  validateData(ContactSchemas.getProfilePictureSchema),
  ContactController.getProfilePicture,
)

registry.registerPath({
  method: 'post',
  path: '/contacts/{phone}/profile-picture',
  tags: ['Contacts'],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      phone: z.string().openapi({ example: '5599999999999' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: ContactSchemas.getProfilePictureSchema,
        },
      },
    },
    parameters: channelParameters,
  },
  responses: {
    200: {
      description:
        'Foto de perfil obtida com sucesso. Observação: no channel=oficial a API pode retornar picture=null.',
      content: {
        'application/json': {
          schema: z.object({
            picture: z
              .string()
              .nullable()
              .openapi({ example: 'https://example.com/picture.jpg' }),
          }),
        },
      },
    },
    400: {
      description: 'Não foi possível obter a foto de perfil. ',
      content: {
        'application/json': {
          schema: responseMessageSchema.openapi({
            example: { message: 'Não foi possível obter a foto de perfil. ' },
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
registry.register(
  'getProfilePictureSchema',
  ContactSchemas.getProfilePictureSchema,
)

module.exports = contactsRoutes
