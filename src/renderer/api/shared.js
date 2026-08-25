import { request } from '../request.js'

export const API_BASE = 'http://127.0.0.1:5174/api'

// 统一请求入口：默认 30s 超时 + 外部 AbortSignal 透传合并 + 结构化错误分类。
// 返回值结构不变：2xx 返回 res.json()，204 返回 null。
export async function apiFetch(path, init) {
  const { signal, timeoutMs, ...rest } = init ?? {}
  const res = await request(
    `${API_BASE}${path}`,
    {
      headers: { 'Content-Type': 'application/json', ...(rest.headers || {}) },
      ...rest,
    },
    { signal, timeoutMs }
  )
  return res.status === 204 ? null : res.json()
}
