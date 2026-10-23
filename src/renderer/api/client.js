const BASE = 'http://127.0.0.1:5174'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export function apiGet(path) {
  return request(path, { method: 'GET' })
}

export function apiPost(path, body) {
  return request(path, { method: 'POST', body: JSON.stringify(body) })
}

export function apiPut(path, body) {
  return request(path, { method: 'PUT', body: JSON.stringify(body) })
}

export function apiDelete(path) {
  return request(path, { method: 'DELETE' })
}

export function apiStream(path, body, onDelta, onDone, onError, { signal } = {}) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  }).then(async (res) => {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const error = new Error(data.error || `HTTP ${res.status}`)
      onError?.(error)
      throw error
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let sawDone = false
    let streamError = null
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const parsed = JSON.parse(line.slice(6))
          if (parsed.kind === 'delta') onDelta?.(parsed.text)
          else if (parsed.kind === 'done') {
            sawDone = true
            onDone?.(parsed.result)
          } else if (parsed.kind === 'error') {
            streamError = new Error(parsed.error)
            onError?.(streamError)
          }
        } catch {
          continue
        }
      }
    }
    if (streamError) throw streamError
    if (!sawDone) throw new Error('回复中断：未收到完成事件')
  })
}
