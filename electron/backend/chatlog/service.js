import { createSqlJsChatlogRepository } from './repository.js'

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

function buildStorageMeta(repository) {
  return {
    driver: repository.driver ?? 'unknown',
    queryContractVersion: repository.queryContractVersion ?? 1,
    migrationHint: 'chatlog_repository_contract_ready_for_storage_swap'
  }
}

export function createChatlogService(store, { repository } = {}) {
  const chatlogRepository = repository ?? createSqlJsChatlogRepository(store)

  return {
    getByDate(date, { cursor, limit } = {}) {
      const pageSize = normalizePageSize(limit)
      const offset = normalizeCursor(cursor)
      const allMessages = chatlogRepository.getMessagesByDate(date)
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
        },
        storage: buildStorageMeta(chatlogRepository)
      }
    },

    listDates({ month, query, limit, cursor } = {}) {
      const result = chatlogRepository.listDateEntries({
        month,
        query,
        limit: normalizePageSize(limit),
        cursor: normalizeCursor(cursor)
      })

      return {
        entries: result.entries,
        filters: {
          month: month || '',
          query: result.searchMeta?.query ?? normalizeString(query).toLowerCase()
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

      const result = this.listDates({ month, query: normalizedKeyword, limit: 500, cursor: 0 })
      return {
        keyword: normalizedKeyword,
        entries: result.entries,
        storage: result.storage
      }
    }
  }
}
