import { getMessagesByDate, listConversationDates } from '../../db.js'

export function createChatlogService(store) {
  return {
    getByDate: (date) => ({
      date,
      messages: getMessagesByDate(store, date)
    }),
    listDates: ({ month } = {}) => ({
      entries: listConversationDates(store, { month })
    })
  }
}
