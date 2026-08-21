import { deleteMessagesByDate, getMessagesByDate } from '../../db.js'
import { createConversationOrchestrator } from '../agent/orchestrator.js'

export function conversationService(store, { baseDir = process.cwd() } = {}) {
  const orchestrator = createConversationOrchestrator(store, { baseDir })

  return {
    sendMessage: ({ date, message }) => orchestrator.runTurn({ date, message }),

    sendMessageStreamed: ({ date, message }, onDelta) =>
      orchestrator.runTurn({
        date,
        message,
        streamFinalReply: true,
        onFinalDelta: onDelta
      }),

    getConversation: (date) => getMessagesByDate(store, date),

    deleteConversation: (date) => {
      deleteMessagesByDate(store, date)
    }
  }
}
