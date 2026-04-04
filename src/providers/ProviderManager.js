const WhaileysProvider = require('./whaileys/WhaileysProvider.js')
const OficialProvider = require('./oficial/OficialProvider.js')

class ProviderManager {
  constructor() {
    this.providers = new Map()
    this.providerRegistry = new Map()
    this.registerDefaultProviders()
  }

  registerDefaultProviders() {
    this.register('whaileys', WhaileysProvider)
    this.register('oficial', OficialProvider)
  }

  register(channel, ProviderClass) {
    this.providerRegistry.set(channel, ProviderClass)
  }

  getProviderClass(channel) {
    if (!this.providerRegistry.has(channel)) {
      throw new Error(`Provider channel '${channel}' not registered`)
    }
    return this.providerRegistry.get(channel)
  }

  async createProvider(phone, channel, webhooks) {
    const ProviderClass = this.getProviderClass(channel)
    const provider = new ProviderClass()
    await provider.connect(phone, webhooks)
    this.providers.set(phone, provider)
    return provider
  }

  getProvider(phone) {
    return this.providers.get(phone)
  }

  async removeProvider(phone) {
    const provider = this.providers.get(phone)
    if (provider) {
      await provider.disconnect(phone)
      this.providers.delete(phone)
    }
  }

  async restoreProvider(phone, channel, webhooks) {
    return await this.createProvider(phone, channel, webhooks)
  }

  getRegisteredChannels() {
    return Array.from(this.providerRegistry.keys())
  }
}

const providerManager = new ProviderManager()

module.exports = providerManager
