import { apiGet } from './client.js'

export function listChatDays({ month } = {}) {
  const query = month ? `?month=${encodeURIComponent(month)}` : ''
  return apiGet(`/api/chatlogs${query}`)
}

export async function getChatDay(date, { cursor, limit } = {}) {
  const params = new URLSearchParams()
  if (cursor !== undefined && cursor !== null && cursor !== '') params.set('cursor', String(cursor))
  if (limit !== undefined && limit !== null) params.set('limit', String(limit))
  const query = params.toString()
  const result = await apiGet(`/api/chatlogs/${date}${query ? `?${query}` : ''}`)
  return {
    ...result,
    messages: (result.messages || []).map((message) => ({
      ...message,
      role: message.role === 'cornie' ? 'assistant' : message.role,
      text: message.content || '',
    })),
    pagination: result.pagination || { hasMore: false, nextCursor: null },
  }
}

export function exportChatDay(date) {
  return apiGet(`/api/chatlogs/${date}/export`)
}
