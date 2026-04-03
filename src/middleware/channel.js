const channelMiddleware = (req, _res, next) => {
  const headerChannel = req.headers['x-channel']
  const queryChannel = req.query?.channel
  const bodyChannel = req.body?.channel

  req.channel = bodyChannel || queryChannel || headerChannel || 'whatsapp'
  next()
}

module.exports = channelMiddleware
