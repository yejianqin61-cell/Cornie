import { deleteMessagesByDate, getMessagesByDate } from '../../db.js'
import { createConversationOrchestrator } from '../agent/orchestrator.js'

export function conversationService(store, { baseDir = process.cwd(), chatFn, chatStreamFn } = {}) {
  const orchestrator = createConversationOrchestrator(store, { baseDir, chatFn, chatStreamFn })

  return {
    sendMessage: ({ date, message, requestId }) => orchestrator.runTurn({ date, message, requestId }),

    sendMessageStreamed: ({ date, message, requestId }, onDelta, { signal } = {}) =>
      orchestrator.runTurn({
        date,
        message,
        requestId,
        streamFinalReply: true,
        onFinalDelta: onDelta,
        signal
      }),

    getConversation: (date) => getMessagesByDate(store, date),

    deleteConversation: (date) => {
      deleteMessagesByDate(store, date)
    }
  }
}
