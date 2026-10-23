const BASE = 'http://127.0.0.1:5174'
// 基础URL,监听本地端口5174，后端服务地址为http://127.0.0.1:5174

async function request(path, options = {}) {
  // 定义一个异步函数request，接收路径和选项参数
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (res.status === 204) return null // 如果响应状态码为204，返回null，表示没有数据
  const data = await res.json() // 将响应数据解析为JSON格式
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`) // 如果响应状态码不为200，抛出一个错误，错误信息为响应数据中的error字段或HTTP状态码
  return data
}

export function apiGet(path) {
  // 定义一个导出函数apiGet，接收路径参数
  return request(path, { method: 'GET' })
}

export function apiPost(path, body) {
  // 定义一个导出函数apiPost，接收路径和请求体参数
  return request(path, { method: 'POST', body: JSON.stringify(body) })
}

export function apiPut(path, body) {
  // 定义一个导出函数apiPut，接收路径和请求体参数
  return request(path, { method: 'PUT', body: JSON.stringify(body) })
}

export function apiDelete(path) {
  // 定义一个导出函数apiDelete，接收路径参数
  return request(path, { method: 'DELETE' })
}

export function apiStream(path, body, onDelta, onDone, onError, { signal } = {}) {
  // 定义一个导出函数apiStream，接收路径、请求体、数据处理函数、完成处理函数和错误处理函数参数
  return fetch(`${BASE}${path}`, {
    // 使用fetch方法发送请求
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  }).then(async (res) => {
    // 当请求完成后，执行一个异步函数
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const error = new Error(data.error || `HTTP ${res.status}`)
      onError?.(error)
      throw error
    }
    const reader = res.body.getReader() // 获取响应体的读取器
    const decoder = new TextDecoder() // 创建一个文本解码器，用于将字节流解码为字符串
    let buffer = '' // 定义一个缓冲区，用于存储未处理的字符串数据
    let sawDone = false
    let streamError = null
    while (true) {
      // 无限循环，直到读取完成
      const { done, value } = await reader.read() // 读取响应体的数据，如果读取完成，done为true，否则为false，value为读取到的字节数据
      if (done) break // 如果读取完成，跳出循环，结束读取
      buffer += decoder.decode(value, { stream: true }) // 将读取到的字节数据解码为字符串，添加到缓冲区中
      const lines = buffer.split('\n') // 将缓冲区中的字符串按换行符分割为多行
      // 保留最后一行，其他行为数据
      buffer = lines.pop() || '' // 将最后一行从lines数组中移除，并将其赋值给缓冲区，如果没有最后一行，则赋值为空字符串
      for (const line of lines) {
        // 遍历每一行数据
        if (line.startsWith('data: ')) {
          // 如果行数据以'data: '开头，表示是有效的数据行
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
            // ignore malformed line
          }
        }
      }
    }
    if (streamError) throw streamError
    if (!sawDone) throw new Error('回复中断：未收到完成事件')
  })
}
