import { deleteAppSetting, getAppSetting, setAppSetting } from '../../db.js'

const MODEL_SETTING_KEYS = {
  apiKey: 'settings.model.deepseek.apiKey',
  baseUrl: 'settings.model.deepseek.baseUrl',
  model: 'settings.model.deepseek.model',
  timeoutMs: 'settings.model.deepseek.timeoutMs'
}

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
    throw new Error('invalid timeoutMs')
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

function readPersistedModelSettings(store) {
  return {
    apiKey: normalizeString(getAppSetting(store, MODEL_SETTING_KEYS.apiKey)),
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

export function applyPersistedModelSettingsToEnv(store) {
  resetModelEnvToInitial()

  const persisted = readPersistedModelSettings(store)
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

export function createSettingsService(store) {
  return {
    getModelSettings() {
      const persisted = readPersistedModelSettings(store)
      return {
        ...buildModelSettingsSummary(persisted),
        source: persisted.apiKey ? 'persisted' : 'empty'
      }
    },

    saveModelSettings(input = {}) {
      const apiKey = normalizeString(input.apiKey)
      if (!apiKey) {
        throw new Error('apiKey is required')
      }

      const baseUrl = normalizeBaseUrl(input.baseUrl)
      const model = normalizeString(input.model)
      const timeoutMs = normalizeTimeout(input.timeoutMs)

      setAppSetting(store, MODEL_SETTING_KEYS.apiKey, apiKey)
      if (baseUrl) setAppSetting(store, MODEL_SETTING_KEYS.baseUrl, baseUrl)
      else deleteAppSetting(store, MODEL_SETTING_KEYS.baseUrl)

      if (model) setAppSetting(store, MODEL_SETTING_KEYS.model, model)
      else deleteAppSetting(store, MODEL_SETTING_KEYS.model)

      if (timeoutMs) setAppSetting(store, MODEL_SETTING_KEYS.timeoutMs, timeoutMs)
      else deleteAppSetting(store, MODEL_SETTING_KEYS.timeoutMs)

      applyPersistedModelSettingsToEnv(store)
      return this.getModelSettings()
    },

    clearModelSettings() {
      deleteAppSetting(store, MODEL_SETTING_KEYS.apiKey)
      deleteAppSetting(store, MODEL_SETTING_KEYS.baseUrl)
      deleteAppSetting(store, MODEL_SETTING_KEYS.model)
      deleteAppSetting(store, MODEL_SETTING_KEYS.timeoutMs)
      applyPersistedModelSettingsToEnv(store)
      return this.getModelSettings()
    }
  }
}
