import { CHATLOG_REPOSITORY_DRIVERS, createChatlogRepository } from './repository.js'

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

function normalizeBeforeId(value) {
  return normalizeString(value)
}

function buildMessageSearchPreview(message, query) {
  const content = normalizeString(message?.matchedPreview || message?.content)
  if (!content) return ''
  const normalizedQuery = normalizeString(query).toLowerCase()
  if (!normalizedQuery) return content.slice(0, 90)
  return content
}

function buildStorageMeta(repository) {
  return {
    driver: repository.driver ?? 'unknown',
    queryContractVersion: repository.queryContractVersion ?? 1,
    migrationHint: 'chatlog_repository_contract_ready_for_storage_swap',
    driverCapabilities: repository.capabilities ?? null,
    availableDrivers: repository.availableDrivers ?? Object.values(CHATLOG_REPOSITORY_DRIVERS),
    capabilities: {
      archiveScopes: ['all', 'recent_30_days', 'month'],
      exportDay: true,
      exportMonth: true
    }
  }
}

function resolveOffsetFromBeforeId(messages, beforeId) {
  const normalizedBeforeId = normalizeBeforeId(beforeId)
  if (!normalizedBeforeId) {
    return null
  }

  const index = messages.findIndex((item) => normalizeString(item?.id) === normalizedBeforeId)
  if (index <= 0) {
    return index === 0 ? 0 : null
  }
  return index
}

function buildPlainTextTranscript(date, messages = []) {
  const lines = [`# Chatlog ${date}`, '']
  for (const message of messages) {
    const roleLabel = message.role === 'cornie' ? '铃湾' : '主人'
    lines.push(`${roleLabel}：${message.content}`)
  }
  return lines.join('\n')
}

export function createChatlogService(store, { repository, driver, dbPath } = {}) {
  const chatlogRepository = repository ?? createChatlogRepository(store, {
    driver,
    dbPath
  })

  return {
    getByDate(date, { cursor, limit, query } = {}) {
      const pageSize = normalizePageSize(limit)
      const offset = normalizeCursor(cursor)
      const normalizedQuery = normalizeString(query).toLowerCase()
      const allMessages = normalizedQuery
        ? chatlogRepository.searchMessagesByDate(date, normalizedQuery)
        : chatlogRepository.getMessagesByDate(date)
      const messages = allMessages.slice(offset, offset + pageSize)
      const nextCursor = offset + pageSize < allMessages.length ? String(offset + pageSize) : null

      return {
        date,
        messages: messages.map((message) => ({
          ...message,
          matchedPreview: buildMessageSearchPreview(message, normalizedQuery)
        })),
        pagination: {
          cursor: String(offset),
          nextCursor,
          hasMore: nextCursor !== null,
          pageSize,
          total: allMessages.length
        },
        searchMeta: {
          query: normalizedQuery,
          mode: normalizedQuery ? 'keyword' : 'browse'
        },
        storage: buildStorageMeta(chatlogRepository)
      }
    },

    getDayPage(date, { cursor, limit, query, beforeId } = {}) {
      const pageSize = normalizePageSize(limit)
      const normalizedQuery = normalizeString(query).toLowerCase()
      const allMessages = normalizedQuery
        ? chatlogRepository.searchMessagesByDate(date, normalizedQuery)
        : chatlogRepository.getMessagesByDate(date)
      const beforeOffset = resolveOffsetFromBeforeId(allMessages, beforeId)
      const offset = beforeOffset != null ? beforeOffset : normalizeCursor(cursor)
      const items = allMessages.slice(offset, offset + pageSize).map((message) => ({
        ...message,
        matchedPreview: buildMessageSearchPreview(message, normalizedQuery)
      }))
      const nextCursor = offset + pageSize < allMessages.length ? String(offset + pageSize) : null
      const firstItemId = items[0]?.id ?? null
      const lastItemId = items[items.length - 1]?.id ?? null

      return {
        date,
        items,
        nextCursor,
        hasMore: nextCursor !== null,
        context: {
          date,
          total: allMessages.length,
          pageSize,
          currentCursor: String(offset),
          query: normalizedQuery,
          beforeId: normalizeBeforeId(beforeId) || null,
          firstItemId,
          lastItemId
        },
        searchMeta: {
          query: normalizedQuery,
          mode: normalizedQuery ? 'keyword' : 'browse'
        },
        storage: buildStorageMeta(chatlogRepository)
      }
    },

    listDates({ month, query, limit, cursor, scope } = {}) {
      const result = chatlogRepository.listDateEntries({
        month,
        query,
        scope,
        limit: normalizePageSize(limit),
        cursor: normalizeCursor(cursor)
      })

      return {
        entries: result.entries,
        filters: {
          scope: result.archiveScope?.scope || scope || 'all',
          month: result.archiveScope?.month || month || '',
          query: result.searchMeta?.query ?? normalizeString(query).toLowerCase()
        },
        archiveScope: result.archiveScope || {
          scope: scope || 'all',
          month: month || '',
          recentFromDate: '',
          recentToDate: ''
        },
        availableMonths: result.availableMonths || [],
        pagination: result.pagination,
        searchMeta: result.searchMeta || {
          query: normalizeString(query).toLowerCase(),
          mode: normalizeString(query) ? 'keyword' : 'browse'
        },
        storage: buildStorageMeta(chatlogRepository)
      }
    },

    getMessageById(date, messageId) {
      const record = this.getByDate(date)
      return record.messages.find((item) => normalizeString(item.id) === normalizeString(messageId)) ?? null
    },

    searchDatesByKeyword(keyword, { month } = {}) {
      const normalizedKeyword = normalizeString(keyword).toLowerCase()
      if (!normalizedKeyword) {
        return {
          keyword: '',
          entries: [],
          storage: buildStorageMeta(chatlogRepository)
        }
      }

      const result = this.listDates({ month, scope: month ? 'month' : 'all', query: normalizedKeyword, limit: 500, cursor: 0 })
      return {
        keyword: normalizedKeyword,
        entries: result.entries,
        storage: result.storage
      }
    },

    searchMessageSnippets(keyword, { month, scope, limit, cursor } = {}) {
      const normalizedKeyword = normalizeString(keyword).toLowerCase()
      const pageSize = normalizePageSize(limit)
      const offset = normalizeCursor(cursor)

      if (!normalizedKeyword) {
        return {
          keyword: '',
          items: [],
          filters: {
            scope: scope || 'all',
            month: month || ''
          },
          pagination: {
            cursor: String(offset),
            nextCursor: null,
            hasMore: false,
            pageSize,
            total: 0
          },
          storage: buildStorageMeta(chatlogRepository)
        }
      }

      const dateResult = this.listDates({
        month,
        scope,
        query: normalizedKeyword,
        limit: 5000,
        cursor: 0
      })

      const allItems = dateResult.entries.flatMap((entry) => {
        const messages = chatlogRepository.searchMessagesByDate(entry.date, normalizedKeyword)
        return messages.map((message) => ({
          date: entry.date,
          messageId: message.id,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
          matchedPreview: buildMessageSearchPreview(message, normalizedKeyword)
        }))
      })

      const items = allItems.slice(offset, offset + pageSize)
      const nextCursor = offset + pageSize < allItems.length ? String(offset + pageSize) : null

      return {
        keyword: normalizedKeyword,
        items,
        filters: {
          scope: dateResult.archiveScope?.scope || scope || 'all',
          month: dateResult.archiveScope?.month || month || ''
        },
        pagination: {
          cursor: String(offset),
          nextCursor,
          hasMore: nextCursor !== null,
          pageSize,
          total: allItems.length
        },
        storage: dateResult.storage
      }
    },

    exportByDate(date, { format = 'json' } = {}) {
      const record = this.getByDate(date, { limit: 5000, cursor: 0 })
      const normalizedFormat = normalizeString(format).toLowerCase() || 'json'
      const payload = {
        kind: 'chatlog_day_export',
        date,
        messageCount: record.messages.length,
        messages: record.messages,
        exportedAt: new Date().toISOString(),
        storage: record.storage
      }

      if (normalizedFormat === 'txt') {
        return {
          format: 'txt',
          filename: `chatlog-${date}.txt`,
          contentType: 'text/plain; charset=utf-8',
          content: buildPlainTextTranscript(date, record.messages),
          meta: payload
        }
      }

      return {
        format: 'json',
        filename: `chatlog-${date}.json`,
        contentType: 'application/json; charset=utf-8',
        content: JSON.stringify(payload, null, 2),
        meta: payload
      }
    },

    exportByMonth(month, { format = 'json' } = {}) {
      const result = this.listDates({ month, limit: 5000, cursor: 0 })
      const items = result.entries.map((entry) => {
        const detail = this.getByDate(entry.date, { limit: 5000, cursor: 0 })
        return {
          date: entry.date,
          messageCount: detail.messages.length,
          messages: detail.messages
        }
      })

      const normalizedFormat = normalizeString(format).toLowerCase() || 'json'
      const payload = {
        kind: 'chatlog_month_export',
        month,
        dayCount: items.length,
        items,
        exportedAt: new Date().toISOString(),
        storage: result.storage
      }

      if (normalizedFormat === 'txt') {
        const blocks = items.map((item) => buildPlainTextTranscript(item.date, item.messages))
        return {
          format: 'txt',
          filename: `chatlog-${month}.txt`,
          contentType: 'text/plain; charset=utf-8',
          content: blocks.join('\n\n---\n\n'),
          meta: payload
        }
      }

      return {
        format: 'json',
        filename: `chatlog-${month}.json`,
        contentType: 'application/json; charset=utf-8',
        content: JSON.stringify(payload, null, 2),
        meta: payload
      }
    }
  }
}
