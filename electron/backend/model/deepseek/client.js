import { assertModelConfigured, getModelConfig } from '../config.js'

function withTimeout(timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer)
  }
}

async function deepseekFetch(path, payload, timeoutMs) {
  const config = assertModelConfigured()
  const { signal, clear } = withTimeout(timeoutMs ?? config.timeoutMs)

  try {
    const res = await fetch(`${config.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const error = new Error(`DeepSeek ${res.status}: ${text}`)
      error.code = `http_${res.status}`
      throw error
    }

    return res.json()
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('DeepSeek request timed out')
      timeoutError.code = 'timeout'
      throw timeoutError
    }
    throw error
  } finally {
    clear()
  }
}

export async function chat({ messages, model, temperature = 0.8, maxTokens = 512, timeoutMs }) {
  const config = getModelConfig()
  const data = await deepseekFetch(
    '/chat/completions',
    {
      model: model || config.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false
    },
    timeoutMs
  )

  return {
    content: data?.choices?.[0]?.message?.content || ''
  }
}

export async function generate({ prompt, model, temperature = 0.7, maxTokens = 300, timeoutMs }) {
  const data = await chat({
    model,
    temperature,
    maxTokens,
    timeoutMs,
    messages: [{ role: 'user', content: prompt }]
  })

  return data
}

export async function checkHealth() {
  const config = getModelConfig()
  if (!config.apiKey) {
    return {
      ok: false,
      provider: config.provider,
      configured: false,
      model: config.model,
      reason: 'missing_api_key'
    }
  }

  return {
    ok: true,
    provider: config.provider,
    configured: true,
    model: config.model
  }
}
