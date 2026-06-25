import { deleteMessagesByDate, getMessagesByDate } from '../../db.js'
import { createConversationOrchestrator } from '../agent/orchestrator.js'

export function conversationService(store) {
  const orchestrator = createConversationOrchestrator(store)

  return {
    sendMessage: ({ date, message }) => orchestrator.runTurn({ date, message }),

    getConversation: (date) => getMessagesByDate(store, date),

    deleteConversation: (date) => {
      deleteMessagesByDate(store, date)
    }
  }
}
