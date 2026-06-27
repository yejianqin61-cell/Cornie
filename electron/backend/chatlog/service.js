import { getMessagesByDate, listConversationDates } from '../../db.js'

function normalizeString(value) {
  return String(value ?? '').trim()
}

function buildSearchText(message) {
  return [message.role, message.content].map((item) => normalizeString(item).toLowerCase()).filter(Boolean).join('\n')
}

export function createChatlogService(store) {
  return {
    getByDate: (date) => ({
      date,
      messages: getMessagesByDate(store, date)
    }),
    listDates: ({ month } = {}) => ({
      entries: listConversationDates(store, { month })
    }),
    getMessageById(date, messageId) {
      const record = this.getByDate(date)
      return record.messages.find((item) => normalizeString(item.id) === normalizeString(messageId)) ?? null
    },
    searchDatesByKeyword(keyword, { month } = {}) {
      const normalizedKeyword = normalizeString(keyword).toLowerCase()
      if (!normalizedKeyword) {
        return { keyword: '', entries: [] }
      }

      const dates = listConversationDates(store, { month })
      const entries = dates
        .map((item) => {
          const messages = getMessagesByDate(store, item.date)
          const matchedMessages = messages.filter((message) => buildSearchText(message).includes(normalizedKeyword))
          if (matchedMessages.length === 0) return null

          return {
            date: item.date,
            messageCount: item.messageCount,
            matchedCount: matchedMessages.length,
            matchedMessageIds: matchedMessages.map((message) => message.id)
          }
        })
        .filter(Boolean)

      return {
        keyword: normalizedKeyword,
        entries
      }
    }
  }
}
