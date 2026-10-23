import { apiPost, apiStream } from './client.js'

export function sendMessage({ message, date } = {}) {
  return apiPost('/api/conversations', { message, date })
}

export function sendMessageStreamed({ message, date }, onDelta, onDone, onError, options) {
  return apiStream('/api/conversations/stream', { message, date }, onDelta, onDone, onError, options)
}
