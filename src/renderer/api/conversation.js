import { apiPost, apiStream } from './client.js'

export function sendMessage({ message, date, requestId } = {}) {
  return apiPost('/api/conversations', { message, date, requestId })
}

export function sendMessageStreamed({ message, date, requestId }, onDelta, onDone, onError, options) {
  return apiStream('/api/conversations/stream', { message, date, requestId }, onDelta, onDone, onError, options)
}
