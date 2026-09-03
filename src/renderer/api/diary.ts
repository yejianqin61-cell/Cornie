import { apiFetch } from './shared'

export interface DiaryEntry {
  date?: string
  content?: string
  cornieReview?: string
  [key: string]: unknown
}

export async function listEntries({ month }: { month?: string } = {}): Promise<unknown> {
  const qs = month ? `?month=${encodeURIComponent(month)}` : ''
  return apiFetch(`/entries${qs}`)
}

export async function getEntry(date: string, { signal }: { signal?: AbortSignal | null } = {}): Promise<DiaryEntry> {
  return apiFetch<DiaryEntry>(`/entries/${encodeURIComponent(date)}`, { signal })
}

export async function upsertEntry(date: string, payload: Partial<DiaryEntry>): Promise<unknown> {
  return apiFetch(`/entries/${encodeURIComponent(date)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

// regenerate-cornie 是 LLM 长任务：默认放宽到 120s（Vue 版走 30s 默认超时，
// 曾出现前端超时报错但服务端仍完成落库、随后旧内容被写回覆盖的竞态）。
export async function regenerateCornie(
  date: string,
  { timeoutMs = 120_000 }: { timeoutMs?: number } = {}
): Promise<unknown> {
  return apiFetch(`/entries/${encodeURIComponent(date)}/regenerate-cornie`, {
    method: 'POST',
    timeoutMs,
  })
}

export async function listOnThisDay(
  date: string,
  { limit, signal }: { limit?: number; signal?: AbortSignal | null } = {}
): Promise<unknown> {
  const qs = limit ? `?limit=${encodeURIComponent(String(limit))}` : ''
  return apiFetch(`/entries/${encodeURIComponent(date)}/on-this-day${qs}`, { signal })
}
