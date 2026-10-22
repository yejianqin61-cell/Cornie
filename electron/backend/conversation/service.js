import { deleteMessagesByDate, getMessagesByDate } from '../../db.js'
import { createConversationOrchestrator } from '../agent/orchestrator.js'

export function conversationService(store, { baseDir = process.cwd(), chatFn, chatStreamFn } = {}) {
  const orchestrator = createConversationOrchestrator(store, { baseDir, chatFn, chatStreamFn })

  return {
    sendMessage: ({ date, message }) => orchestrator.runTurn({ date, message }),

    sendMessageStreamed: ({ date, message }, onDelta, { signal } = {}) =>
      orchestrator.runTurn({
        date,
        message,
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
