import { getMessagesByDate, listConversationDates } from '../../db.js'

const DEFAULT_CHATLOG_PAGE_SIZE = 100

function normalizeString(value) {
  return String(value ?? '').trim()
}

function normalizePageSize(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_CHATLOG_PAGE_SIZE
  }
  return Math.min(parsed, 500)
}

function normalizeCursor(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }
  return parsed
}

function buildSearchText(message) {
  return [message.role, message.content].map((item) => normalizeString(item).toLowerCase()).filter(Boolean).join('\n')
}

function buildMatchedPreview(message, keyword) {
  const content = normalizeString(message?.content)
  if (!content) return ''

  const normalizedContent = content.toLowerCase()
  const index = normalizedContent.indexOf(keyword)
  if (index === -1) {
    return content.slice(0, 80)
  }

  const start = Math.max(0, index - 18)
  const end = Math.min(content.length, index + keyword.length + 32)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < content.length ? '…' : ''
  return `${prefix}${content.slice(start, end)}${suffix}`
}

function buildAvailableMonths(entries) {
  return Array.from(new Set(entries.map((item) => normalizeString(item.date).slice(0, 7)).filter(Boolean)))
}

export function createChatlogService(store) {
  return {
    getByDate(date, { cursor, limit } = {}) {
      const pageSize = normalizePageSize(limit)
      const offset = normalizeCursor(cursor)
      const allMessages = getMessagesByDate(store, date)
      const messages = allMessages.slice(offset, offset + pageSize)
      const nextCursor = offset + pageSize < allMessages.length ? String(offset + pageSize) : null

      return {
        date,
        messages,
        pagination: {
          cursor: String(offset),
          nextCursor,
          hasMore: nextCursor !== null,
          pageSize,
          total: allMessages.length
        }
      }
    },
    listDates({ month, query, limit, cursor } = {}) {
      const pageSize = normalizePageSize(limit)
      const offset = normalizeCursor(cursor)
      const allEntries = listConversationDates(store, { month })
      const availableMonths = buildAvailableMonths(listConversationDates(store))
      const normalizedQuery = normalizeString(query).toLowerCase()

      const filteredEntries = normalizedQuery
        ? allEntries
            .map((item) => {
              const messages = getMessagesByDate(store, item.date)
              const matchedMessages = messages.filter((message) => buildSearchText(message).includes(normalizedQuery))
              if (matchedMessages.length === 0) return null

              return {
                date: item.date,
                messageCount: item.messageCount,
                matchedCount: matchedMessages.length,
                matchedMessageIds: matchedMessages.map((message) => message.id),
                matchedPreview: buildMatchedPreview(matchedMessages[0], normalizedQuery)
              }
            })
            .filter(Boolean)
        : allEntries.map((item) => ({
            ...item,
            matchedCount: 0,
            matchedMessageIds: [],
            matchedPreview: ''
          }))

      const entries = filteredEntries.slice(offset, offset + pageSize)
      const nextCursor = offset + pageSize < filteredEntries.length ? String(offset + pageSize) : null

      return {
        entries,
        filters: {
          month: month || '',
          query: normalizedQuery
        },
        availableMonths,
        pagination: {
          cursor: String(offset),
          nextCursor,
          hasMore: nextCursor !== null,
          pageSize,
          total: filteredEntries.length
        },
        storage: {
          driver: 'sql.js',
          queryContractVersion: 1,
          migrationHint: 'response_prepared_for_cursor_and_search_expansion'
        }
      }
    },
    getMessageById(date, messageId) {
      const record = this.getByDate(date)
      return record.messages.find((item) => normalizeString(item.id) === normalizeString(messageId)) ?? null
    },
    searchDatesByKeyword(keyword, { month } = {}) {
      const normalizedKeyword = normalizeString(keyword).toLowerCase()
      if (!normalizedKeyword) {
        return { keyword: '', entries: [] }
      }

      return {
        keyword: normalizedKeyword,
        entries: this.listDates({ month, query: normalizedKeyword, limit: 500, cursor: 0 }).entries
      }
    }
  }
}
