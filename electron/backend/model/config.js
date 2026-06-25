const DEFAULT_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-chat'
const DEFAULT_TIMEOUT_MS = 30_000

function parseTimeout(value, fallback = DEFAULT_TIMEOUT_MS) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function getModelConfig() {
  return {
    provider: 'deepseek',
    apiKey: process.env.DEEPSEEK_API_KEY?.trim() || '',
    baseUrl: (process.env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    model: process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL,
    timeoutMs: parseTimeout(process.env.DEEPSEEK_TIMEOUT_MS)
  }
}

export function assertModelConfigured() {
  const config = getModelConfig()
  if (!config.apiKey) {
    const error = new Error('DeepSeek API key is not configured')
    error.code = 'missing_api_key'
    throw error
  }
  return config
}
