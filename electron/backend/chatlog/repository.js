import { getMessagesByDate, listConversationDates } from '../../db.js'

function normalizeString(value) {
  return String(value ?? '').trim()
}

function normalizePageSize(value, fallback = 100, max = 500) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

function normalizeCursor(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

function buildSearchText(message) {
  return [message.role, message.content]
    .map((item) => normalizeString(item).toLowerCase())
    .filter(Boolean)
    .join('\n')
}

function buildMatchedPreview(message, keyword) {
  const content = normalizeString(message?.content)
  if (!content) return ''

  const normalizedContent = content.toLowerCase()
  const index = normalizedContent.indexOf(keyword)
  if (index === -1) return content.slice(0, 80)

  const start = Math.max(0, index - 18)
  const end = Math.min(content.length, index + keyword.length + 32)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < content.length ? '…' : ''
  return `${prefix}${content.slice(start, end)}${suffix}`
}

function buildMessageMatchedPreview(message, keyword) {
  const content = normalizeString(message?.content)
  if (!content) return ''

  const normalizedContent = content.toLowerCase()
  const index = normalizedContent.indexOf(keyword)
  if (index === -1) return ''

  const start = Math.max(0, index - 24)
  const end = Math.min(content.length, index + keyword.length + 40)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < content.length ? '…' : ''
  return `${prefix}${content.slice(start, end)}${suffix}`
}

function buildAvailableMonths(entries) {
  return Array.from(new Set(entries.map((item) => normalizeString(item.date).slice(0, 7)).filter(Boolean)))
}

export function createSqlJsChatlogRepository(store) {
  return {
    driver: 'sql.js',
    queryContractVersion: 2,
    getMessagesByDate(date) {
      return getMessagesByDate(store, date)
    },
    searchMessagesByDate(date, keyword) {
      const normalizedKeyword = normalizeString(keyword).toLowerCase()
      if (!normalizedKeyword) {
        return []
      }

      return getMessagesByDate(store, date)
        .filter((message) => buildSearchText(message).includes(normalizedKeyword))
        .map((message) => ({
          ...message,
          matchedPreview: buildMessageMatchedPreview(message, normalizedKeyword)
        }))
    },
    listDateEntries({ month, query, limit, cursor } = {}) {
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
        availableMonths,
        pagination: {
          cursor: String(offset),
          nextCursor,
          hasMore: nextCursor !== null,
          pageSize,
          total: filteredEntries.length
        },
        searchMeta: {
          query: normalizedQuery,
          mode: normalizedQuery ? 'keyword' : 'browse'
        }
      }
    }
  }
}
