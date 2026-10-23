import { deleteAppSetting, getAppSetting, setAppSetting } from '../../db.js'
import { badRequest, HttpError } from '../http/errors.js'

const MODEL_SETTING_KEYS = {
  apiKey: 'settings.model.deepseek.apiKey',
  baseUrl: 'settings.model.deepseek.baseUrl',
  model: 'settings.model.deepseek.model',
  timeoutMs: 'settings.model.deepseek.timeoutMs'
}
const SECURE_API_KEY_PREFIX = 'safeStorage:v1:'

const INITIAL_MODEL_ENV = {
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
  baseUrl: process.env.DEEPSEEK_BASE_URL ?? '',
  model: process.env.DEEPSEEK_MODEL ?? '',
  timeoutMs: process.env.DEEPSEEK_TIMEOUT_MS ?? ''
}

function normalizeString(value) {
  return String(value ?? '').trim()
}

function normalizeBaseUrl(value) {
  return normalizeString(value).replace(/\/+$/, '')
}

function normalizeTimeout(value) {
  const normalized = normalizeString(value)
  if (!normalized) return ''
  const parsed = Number.parseInt(normalized, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw badRequest('invalid timeoutMs', undefined, 'invalid_timeout')
  }
  return String(parsed)
}

function maskApiKey(apiKey) {
  const normalized = normalizeString(apiKey)
  if (!normalized) return ''
  if (normalized.length <= 8) {
    return `${normalized.slice(0, 2)}***${normalized.slice(-1)}`
  }
  return `${normalized.slice(0, 4)}***${normalized.slice(-4)}`
}

function decryptApiKey(value, secretStore) {
  const stored = normalizeString(value)
  if (!stored) return ''
  if (!stored.startsWith(SECURE_API_KEY_PREFIX)) {
    throw new Error('stored API key is not protected by safeStorage')
  }
  if (!secretStore || typeof secretStore.decrypt !== 'function') {
    throw new Error('secure API key storage is unavailable')
  }
  return normalizeString(secretStore.decrypt(stored))
}

function encryptApiKey(value, secretStore) {
  if (!secretStore || typeof secretStore.encrypt !== 'function') {
    throw new Error('secure API key storage is unavailable')
  }
  const encrypted = normalizeString(secretStore.encrypt(value))
  if (!encrypted.startsWith(SECURE_API_KEY_PREFIX) || encrypted === value) {
    throw new Error('secure API key storage returned an invalid value')
  }
  return encrypted
}

function readPersistedApiKey(store, secretStore) {
  const stored = normalizeString(getAppSetting(store, MODEL_SETTING_KEYS.apiKey))
  if (!stored) return ''
  if (stored.startsWith(SECURE_API_KEY_PREFIX)) {
    return decryptApiKey(stored, secretStore)
  }

  // Upgrade values written by pre-safeStorage releases in the main process.
  // The raw value is never accepted as a persisted format or copied to a new fallback store.
  const encrypted = encryptApiKey(stored, secretStore)
  setAppSetting(store, MODEL_SETTING_KEYS.apiKey, encrypted)
  return stored
}

function readPersistedModelSettings(store, { secretStore } = {}) {
  return {
    apiKey: readPersistedApiKey(store, secretStore),
    baseUrl: normalizeBaseUrl(getAppSetting(store, MODEL_SETTING_KEYS.baseUrl)),
    model: normalizeString(getAppSetting(store, MODEL_SETTING_KEYS.model)),
    timeoutMs: normalizeString(getAppSetting(store, MODEL_SETTING_KEYS.timeoutMs))
  }
}

function buildModelSettingsSummary(settings) {
  return {
    provider: 'deepseek',
    configured: Boolean(settings.apiKey),
    hasApiKey: Boolean(settings.apiKey),
    maskedApiKey: maskApiKey(settings.apiKey),
    baseUrl: settings.baseUrl,
    model: settings.model,
    timeoutMs: settings.timeoutMs ? Number.parseInt(settings.timeoutMs, 10) : null
  }
}

function setEnvValue(key, value) {
  if (value) {
    process.env[key] = value
    return
  }
  delete process.env[key]
}

function resetModelEnvToInitial() {
  setEnvValue('DEEPSEEK_API_KEY', INITIAL_MODEL_ENV.apiKey)
  setEnvValue('DEEPSEEK_BASE_URL', INITIAL_MODEL_ENV.baseUrl)
  setEnvValue('DEEPSEEK_MODEL', INITIAL_MODEL_ENV.model)
  setEnvValue('DEEPSEEK_TIMEOUT_MS', INITIAL_MODEL_ENV.timeoutMs)
}

export function applyPersistedModelSettingsToEnv(store, { secretStore } = {}) {
  resetModelEnvToInitial()

  const persisted = readPersistedModelSettings(store, { secretStore })
  if (!process.env.DEEPSEEK_API_KEY && persisted.apiKey) {
    process.env.DEEPSEEK_API_KEY = persisted.apiKey
  }
  if (!process.env.DEEPSEEK_BASE_URL && persisted.baseUrl) {
    process.env.DEEPSEEK_BASE_URL = persisted.baseUrl
  }
  if (!process.env.DEEPSEEK_MODEL && persisted.model) {
    process.env.DEEPSEEK_MODEL = persisted.model
  }
  if (!process.env.DEEPSEEK_TIMEOUT_MS && persisted.timeoutMs) {
    process.env.DEEPSEEK_TIMEOUT_MS = persisted.timeoutMs
  }

  return {
    persisted: buildModelSettingsSummary(persisted),
    effectiveSource: process.env.DEEPSEEK_API_KEY ? 'env_or_persisted' : 'none'
  }
}

export function createSettingsService(store, { secretStore } = {}) {
  return {
    getModelSettings() {
      const persisted = readPersistedModelSettings(store, { secretStore })
      return {
        ...buildModelSettingsSummary(persisted),
        source: persisted.apiKey ? 'persisted' : 'empty'
      }
    },

    saveModelSettings(input = {}) {
      const apiKey = normalizeString(input.apiKey)
      if (!apiKey) {
        throw badRequest('apiKey is required', undefined, 'api_key_required')
      }

      const baseUrl = normalizeBaseUrl(input.baseUrl)
      const model = normalizeString(input.model)
      const timeoutMs = normalizeTimeout(input.timeoutMs)

      setAppSetting(store, MODEL_SETTING_KEYS.apiKey, encryptApiKey(apiKey, secretStore))
      if (baseUrl) setAppSetting(store, MODEL_SETTING_KEYS.baseUrl, baseUrl)
      else deleteAppSetting(store, MODEL_SETTING_KEYS.baseUrl)

      if (model) setAppSetting(store, MODEL_SETTING_KEYS.model, model)
      else deleteAppSetting(store, MODEL_SETTING_KEYS.model)

      if (timeoutMs) setAppSetting(store, MODEL_SETTING_KEYS.timeoutMs, timeoutMs)
      else deleteAppSetting(store, MODEL_SETTING_KEYS.timeoutMs)

      applyPersistedModelSettingsToEnv(store, { secretStore })
      return this.getModelSettings()
    },

    clearModelSettings() {
      deleteAppSetting(store, MODEL_SETTING_KEYS.apiKey)
      deleteAppSetting(store, MODEL_SETTING_KEYS.baseUrl)
      deleteAppSetting(store, MODEL_SETTING_KEYS.model)
      deleteAppSetting(store, MODEL_SETTING_KEYS.timeoutMs)
      applyPersistedModelSettingsToEnv(store, { secretStore })
      return this.getModelSettings()
    }
  }
}
