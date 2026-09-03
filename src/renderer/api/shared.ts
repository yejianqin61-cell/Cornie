import { request } from '../request'

export const API_BASE = 'http://127.0.0.1:5174/api'

export interface ApiFetchOptions extends Omit<RequestInit, 'signal'> {
  signal?: AbortSignal | null
  timeoutMs?: number
}

// 统一请求入口：默认 30s 超时 + 外部 AbortSignal 透传合并 + 结构化错误分类。
// 返回值结构不变：2xx 返回 res.json()，204 返回 null。
export async function apiFetch<T = unknown>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const { signal, timeoutMs, ...rest } = init
  const res = await request(
    `${API_BASE}${path}`,
    {
      headers: { 'Content-Type': 'application/json', ...((rest.headers as Record<string, string>) || {}) },
      ...rest,
    },
    { signal, timeoutMs }
  )
  return (res.status === 204 ? null : ((await res.json()) as T)) as T
}
