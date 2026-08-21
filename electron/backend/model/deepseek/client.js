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
    content: data?.choices?.[0]?.message?.content || '',
    finishReason: data?.choices?.[0]?.finish_reason || null,
    usage: data?.usage || null
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

// 454：流式对话（SSE）。逐块回调 delta 文本；tool_call 等结构化输出不在本通道内流式。
export async function chatStream({ messages, model, temperature = 0.7, maxTokens = 512, timeoutMs }, onDelta) {
  if (typeof onDelta !== 'function') {
    throw new Error('chatStream requires an onDelta callback')
  }

  const config = assertModelConfigured()
  const { signal, clear } = withTimeout(timeoutMs ?? config.timeoutMs)

  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || config.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true
      }),
      signal
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const error = new Error(`DeepSeek ${res.status}: ${text}`)
      error.code = `http_${res.status}`
      throw error
    }

    let content = ''
    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let newlineIndex
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)
        if (!line.startsWith('data:')) continue

        const data = line.slice(5).trim()
        if (data === '[DONE]') {
          return { content, finishReason: 'stop', usage: null }
        }

        try {
          const parsed = JSON.parse(data)
          const delta = parsed?.choices?.[0]?.delta?.content ?? ''
          if (delta) {
            content += delta
            onDelta(delta)
          }
        } catch {
          // 忽略无法解析的 SSE 行（如心跳/注释）
        }
      }
    }

    return { content, finishReason: 'stop', usage: null }
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('DeepSeek stream timed out')
      timeoutError.code = 'timeout'
      throw timeoutError
    }
    throw error
  } finally {
    clear()
  }
}
