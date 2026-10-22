import { apiGet, apiDelete } from './client.js'

export function listChatDays() {
  return apiGet('/api/chatlogs')
}

export async function getChatDay(date) {
  const result = await apiGet(`/api/chatlogs/${date}`)
  return {
    ...result,
    messages: (result.messages || []).map((message) => ({
      ...message,
      role: message.role === 'cornie' ? 'assistant' : message.role,
      text: message.content || '',
    })),
  }
}

export function deleteChatDay(date) {
  return apiDelete(`/api/conversations/${date}`)
}
