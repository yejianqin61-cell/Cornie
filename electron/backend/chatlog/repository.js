import { getMessagesByDate, listConversationDates } from '../../db.js'
import BetterSqlite3 from 'better-sqlite3'

export const CHATLOG_REPOSITORY_DRIVERS = Object.freeze({
  sqljs: 'sql.js',
  betterSqlite3: 'better-sqlite3'
})

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

function normalizeScope(value) {
  const normalized = normalizeString(value).toLowerCase()
  if (['all', 'recent_30_days', 'month'].includes(normalized)) {
    return normalized
  }
  return 'all'
}

function resolveLatestDate(entries = []) {
  const dates = entries.map((item) => normalizeString(item.date)).filter(Boolean).sort()
  return dates.length > 0 ? dates[dates.length - 1] : ''
}

function shiftDateByDays(dateText, days) {
  const value = normalizeString(dateText)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const base = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(base.getTime())) return ''
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
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

function buildRepositoryCapabilities({
  supportsNativePaging = false,
  supportsNativeKeywordSearch = false,
  migrationReady = false,
  status = 'active'
} = {}) {
  return {
    supportsNativePaging,
    supportsNativeKeywordSearch,
    migrationReady,
    status
  }
}

function createRepositoryDescriptor({
  driver,
  queryContractVersion = 2,
  capabilities,
  availableDrivers = Object.values(CHATLOG_REPOSITORY_DRIVERS),
  runtimeStatus = null
} = {}) {
  return {
    driver,
    queryContractVersion,
    capabilities: capabilities ?? buildRepositoryCapabilities(),
    availableDrivers,
    runtimeStatus
  }
}

function buildRuntimeStatus({
  requestedDriver,
  effectiveDriver,
  dbPath,
  usingFallback = false,
  fallbackReason = '',
  initializationOk = true,
  initializationError = '',
  detail = ''
} = {}) {
  return {
    requestedDriver: requestedDriver || 'auto',
    effectiveDriver: effectiveDriver || 'unknown',
    dbPath: normalizeString(dbPath),
    usingFallback,
    fallbackReason: normalizeString(fallbackReason),
    initialization: {
      ok: initializationOk,
      error: normalizeString(initializationError),
      detail: normalizeString(detail)
    }
  }
}

export function createSqlJsChatlogRepository(store, { requestedDriver, fallbackReason } = {}) {
  const runtimeStatus = buildRuntimeStatus({
    requestedDriver,
    effectiveDriver: CHATLOG_REPOSITORY_DRIVERS.sqljs,
    dbPath: store?.dbPath,
    usingFallback: true,
    fallbackReason: fallbackReason || 'sqljs_compatibility_path_selected',
    initializationOk: true,
    detail: 'Using compatibility chatlog repository backed by sql.js helpers.'
  })

  const descriptor = createRepositoryDescriptor({
    driver: CHATLOG_REPOSITORY_DRIVERS.sqljs,
    capabilities: buildRepositoryCapabilities({
      supportsNativePaging: false,
      supportsNativeKeywordSearch: false,
      migrationReady: true,
      status: 'active'
    }),
    runtimeStatus
  })

  return {
    ...descriptor,
    getRuntimeStatus() {
      return { ...runtimeStatus }
    },
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
    listDateEntries({ month, query, limit, cursor, scope } = {}) {
      const pageSize = normalizePageSize(limit)
      const offset = normalizeCursor(cursor)
      const normalizedScope = normalizeScope(scope)
      const allIndexedEntries = listConversationDates(store)
      const availableMonths = buildAvailableMonths(allIndexedEntries)
      const normalizedQuery = normalizeString(query).toLowerCase()
      const effectiveMonth = normalizedScope === 'month' ? normalizeString(month) : ''
      const recentLatestDate = normalizedScope === 'recent_30_days' ? resolveLatestDate(allIndexedEntries) : ''
      const recentFromDate = recentLatestDate ? shiftDateByDays(recentLatestDate, -29) : ''

      const allEntries = allIndexedEntries.filter((item) => {
        const date = normalizeString(item.date)
        if (normalizedScope === 'month') {
          return effectiveMonth ? date.startsWith(`${effectiveMonth}-`) : true
        }
        if (normalizedScope === 'recent_30_days') {
          return recentFromDate ? date >= recentFromDate : true
        }
        return true
      })

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
        archiveScope: {
          scope: normalizedScope,
          month: effectiveMonth,
          recentFromDate: normalizedScope === 'recent_30_days' ? recentFromDate : '',
          recentToDate: normalizedScope === 'recent_30_days' ? recentLatestDate : ''
        },
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

function mapConversationRow(row) {
  return {
    id: String(row.id),
    date: String(row.date),
    role: String(row.role),
    content: String(row.content),
    createdAt: Number(row.createdAt)
  }
}

function createReadonlyBetterSqliteConnection(dbPath) {
  const normalizedPath = normalizeString(dbPath)
  if (!normalizedPath) {
    throw new Error('better-sqlite3 chatlog repository requires dbPath')
  }

  return new BetterSqlite3(normalizedPath, {
    readonly: true,
    fileMustExist: true
  })
}

function probeBetterSqlite3Connection(dbPath) {
  const database = createReadonlyBetterSqliteConnection(dbPath)
  try {
    database.prepare('select 1').get()
    return {
      ok: true,
      error: '',
      detail: 'Readonly better-sqlite3 connection is available.'
    }
  } finally {
    database.close()
  }
}

export function createBetterSqlite3ChatlogRepository({ dbPath, requestedDriver } = {}) {
  const probe = probeBetterSqlite3Connection(dbPath)
  const runtimeStatus = buildRuntimeStatus({
    requestedDriver,
    effectiveDriver: CHATLOG_REPOSITORY_DRIVERS.betterSqlite3,
    dbPath,
    usingFallback: false,
    initializationOk: probe.ok,
    initializationError: probe.error,
    detail: probe.detail
  })

  const descriptor = createRepositoryDescriptor({
    driver: CHATLOG_REPOSITORY_DRIVERS.betterSqlite3,
    capabilities: buildRepositoryCapabilities({
      supportsNativePaging: true,
      supportsNativeKeywordSearch: true,
      migrationReady: true,
      status: 'active'
    }),
    runtimeStatus
  })

  function withDatabase(callback) {
    const database = createReadonlyBetterSqliteConnection(dbPath)
    try {
      return callback(database)
    } finally {
      database.close()
    }
  }

  function listDateEntriesBase({ month, scope } = {}) {
    return withDatabase((database) => {
      const normalizedScope = normalizeScope(scope)
      const allIndexedEntries = database
        .prepare(`
          select date, count(*) as messageCount
          from conversations
          group by date
          order by date desc
        `)
        .all()
        .map((row) => ({
          date: String(row.date),
          messageCount: Number(row.messageCount)
        }))

      const availableMonths = buildAvailableMonths(allIndexedEntries)
      const effectiveMonth = normalizedScope === 'month' ? normalizeString(month) : ''
      const recentLatestDate = normalizedScope === 'recent_30_days' ? resolveLatestDate(allIndexedEntries) : ''
      const recentFromDate = recentLatestDate ? shiftDateByDays(recentLatestDate, -29) : ''

      const scopedEntries = allIndexedEntries.filter((item) => {
        const date = normalizeString(item.date)
        if (normalizedScope === 'month') {
          return effectiveMonth ? date.startsWith(`${effectiveMonth}-`) : true
        }
        if (normalizedScope === 'recent_30_days') {
          return recentFromDate ? date >= recentFromDate : true
        }
        return true
      })

      return {
        normalizedScope,
        effectiveMonth,
        recentLatestDate,
        recentFromDate,
        availableMonths,
        scopedEntries
      }
    })
  }

  return {
    ...descriptor,
    getRuntimeStatus() {
      return { ...runtimeStatus }
    },
    getMessagesByDate(date) {
      return withDatabase((database) =>
        database
          .prepare(`
            select id, date, role, content, created_at as createdAt
            from conversations
            where date = ?
            order by created_at asc
          `)
          .all(normalizeString(date))
          .map(mapConversationRow)
      )
    },
    searchMessagesByDate(date, keyword) {
      const normalizedKeyword = normalizeString(keyword).toLowerCase()
      if (!normalizedKeyword) {
        return []
      }

      const like = `%${normalizedKeyword}%`
      return withDatabase((database) =>
        database
          .prepare(`
            select id, date, role, content, created_at as createdAt
            from conversations
            where date = ?
              and (
                lower(coalesce(role, '')) like ?
                or lower(coalesce(content, '')) like ?
              )
            order by created_at asc
          `)
          .all(normalizeString(date), like, like)
          .map((row) => ({
            ...mapConversationRow(row),
            matchedPreview: buildMessageMatchedPreview(row, normalizedKeyword)
          }))
      )
    },
    listDateEntries({ month, query, limit, cursor, scope } = {}) {
      const pageSize = normalizePageSize(limit)
      const offset = normalizeCursor(cursor)
      const normalizedQuery = normalizeString(query).toLowerCase()
      const {
        normalizedScope,
        effectiveMonth,
        recentFromDate,
        recentLatestDate,
        availableMonths,
        scopedEntries
      } = listDateEntriesBase({ month, scope })

      const filteredEntries = normalizedQuery
        ? scopedEntries
            .map((item) => {
              const matchedMessages = this.searchMessagesByDate(item.date, normalizedQuery)
              if (matchedMessages.length === 0) {
                return null
              }

              return {
                date: item.date,
                messageCount: item.messageCount,
                matchedCount: matchedMessages.length,
                matchedMessageIds: matchedMessages.map((message) => message.id),
                matchedPreview: buildMatchedPreview(matchedMessages[0], normalizedQuery)
              }
            })
            .filter(Boolean)
        : scopedEntries.map((item) => ({
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
        archiveScope: {
          scope: normalizedScope,
          month: effectiveMonth,
          recentFromDate: normalizedScope === 'recent_30_days' ? recentFromDate : '',
          recentToDate: normalizedScope === 'recent_30_days' ? recentLatestDate : ''
        },
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
    },
    close() {}
  }
}

export function createChatlogRepository(store, { driver, dbPath } = {}) {
  const normalizedDriver = normalizeString(driver)
  const resolvedDbPath = dbPath ?? store?.dbPath
  const effectiveDriver =
    normalizedDriver ||
    (normalizeString(resolvedDbPath) ? CHATLOG_REPOSITORY_DRIVERS.betterSqlite3 : CHATLOG_REPOSITORY_DRIVERS.sqljs)

  if (effectiveDriver === CHATLOG_REPOSITORY_DRIVERS.sqljs) {
    return createSqlJsChatlogRepository(store, {
      requestedDriver: normalizedDriver || 'auto',
      fallbackReason: normalizeString(resolvedDbPath)
        ? 'sqljs_explicitly_selected'
        : 'db_path_unavailable_using_sqljs_compatibility'
    })
  }

  if (effectiveDriver === CHATLOG_REPOSITORY_DRIVERS.betterSqlite3) {
    return createBetterSqlite3ChatlogRepository({
      dbPath: resolvedDbPath,
      requestedDriver: normalizedDriver || 'auto'
    })
  }

  throw new Error(`unsupported chatlog repository driver: ${effectiveDriver}`)
}
