const OLLAMA_BASE = 'http://127.0.0.1:11434'
const DEFAULT_MODEL = 'qwen3.5'
const DEFAULT_TIMEOUT_MS = 30_000

async function ollamaFetch(path, init = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), init.timeout || DEFAULT_TIMEOUT_MS)

  try {
    const res = await fetch(`${OLLAMA_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
      ...init,
      signal: controller.signal
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Ollama ${res.status}: ${text}`)
    }
    return res
  } finally {
    clearTimeout(timeout)
  }
}

export async function checkHealth() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

export async function listModels() {
  const res = await ollamaFetch('/api/tags')
  const data = await res.json()
  return (data.models || []).map((m) => m.name)
}

export async function checkModelAvailable(model = DEFAULT_MODEL) {
  try {
    const models = await listModels()
    return models.some((m) => m === model || m.startsWith(`${model}:`))
  } catch {
    return false
  }
}

export async function chat({ model = DEFAULT_MODEL, messages, temperature = 0.8, topP = 0.9 }) {
  const res = await ollamaFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature,
        top_p: topP,
        repeat_penalty: 1.1
      }
    }),
    timeout: 60_000
  })

  const data = await res.json()
  return data.message?.content || ''
}

export async function generate({ model = DEFAULT_MODEL, prompt, temperature = 0.7, maxTokens = 300 }) {
  const res = await ollamaFetch('/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens
      }
    }),
    timeout: 60_000
  })

  const data = await res.json()
  return data.response || ''
}

export { DEFAULT_MODEL }
