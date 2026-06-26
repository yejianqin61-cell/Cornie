const READ_ONLY_CATEGORY_LOOKUP_TOOL_CONFIG = {
  'ledger_category.list_expense': {
    domain: 'ledger',
    lookupType: 'category',
    categoryType: 'expense'
  },
  'ledger_category.list_income': {
    domain: 'ledger',
    lookupType: 'category',
    categoryType: 'income'
  },
  'todo_category.list': {
    domain: 'todo',
    lookupType: 'category',
    categoryType: null
  },
  'schedule_category.list': {
    domain: 'schedule',
    lookupType: 'category',
    categoryType: null
  }
}

const READ_ONLY_CATEGORY_LOOKUP_TOOLS = new Set(Object.keys(READ_ONLY_CATEGORY_LOOKUP_TOOL_CONFIG))

function normalizeLookupQuery(value) {
  if (value == null) {
    return null
  }

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '')

  return normalized || null
}

function toLookupContextConfig(toolName) {
  const categoryLookupConfig = READ_ONLY_CATEGORY_LOOKUP_TOOL_CONFIG[toolName]
  if (categoryLookupConfig) {
    return categoryLookupConfig
  }

  if (toolName === 'todo.list_today' || toolName === 'todo.list_by_range' || toolName === 'todo.get') {
    return {
      domain: 'todo',
      lookupType: 'todo_items',
      categoryType: null
    }
  }
  if (
    toolName === 'schedule.list_today' ||
    toolName === 'schedule.list_by_range' ||
    toolName === 'schedule.get'
  ) {
    return {
      domain: 'schedule',
      lookupType: 'schedule_items',
      categoryType: null
    }
  }
  return null
}

export function createToolRoundState() {
  return {
    readOnlyLookupCount: 0,
    lastReadOnlyLookups: [],
    lastLookupCacheStats: [],
    lookupUsageByDomain: {
      ledger: 0,
      todo: 0,
      schedule: 0
    },
    readOnlyLookupCache: new Map()
  }
}

export function isReadOnlyLookupTool(toolName) {
  return READ_ONLY_CATEGORY_LOOKUP_TOOLS.has(toolName)
}

export function getReadOnlyLookupDomain(toolName) {
  return READ_ONLY_CATEGORY_LOOKUP_TOOL_CONFIG[toolName]?.domain ?? null
}

export function isReadOnlyLookupRound(toolCalls = []) {
  return (
    Array.isArray(toolCalls) &&
    toolCalls.length > 0 &&
    toolCalls.every((item) => isReadOnlyLookupTool(item?.tool_name))
  )
}

export function canExecuteReadOnlyLookupRound(state, toolCalls = []) {
  if (!isReadOnlyLookupRound(toolCalls)) {
    return true
  }

  const domains = [...new Set(toolCalls.map((item) => getReadOnlyLookupDomain(item?.tool_name)).filter(Boolean))]
  if (domains.length === 0) {
    return false
  }

  return domains.every((domain) => (state.lookupUsageByDomain?.[domain] ?? 0) < 1)
}

function buildReadOnlyLookupCacheKey({ domain, lookupType, categoryType, query }) {
  const normalizedQuery = normalizeLookupQuery(query)
  if (!domain || !lookupType || !normalizedQuery) {
    return null
  }

  return `${domain}:${lookupType}:${categoryType ?? 'all'}:${normalizedQuery}`
}

function normalizeCachedLookupResult(result, { toolName, query, domain, lookupType, categoryType }) {
  return {
    ok: true,
    tool_name: toolName,
    result: {
      ...(result ?? {}),
      query,
      domain,
      lookupType,
      categoryType,
      hitSource: 'cache'
    }
  }
}

export function getCachedReadOnlyLookupResult(state, toolCall) {
  const lookupContextConfig = toLookupContextConfig(toolCall?.tool_name)
  if (!lookupContextConfig) {
    return null
  }

  const query = toolCall?.arguments?.query ?? null
  const cacheKey = buildReadOnlyLookupCacheKey({
    domain: lookupContextConfig.domain,
    lookupType: lookupContextConfig.lookupType,
    categoryType: lookupContextConfig.categoryType,
    query
  })

  if (!cacheKey) {
    return null
  }

  const cachedResult = state.readOnlyLookupCache?.get(cacheKey)
  if (!cachedResult) {
    return null
  }

  return normalizeCachedLookupResult(cachedResult, {
    toolName: toolCall.tool_name,
    query,
    domain: lookupContextConfig.domain,
    lookupType: lookupContextConfig.lookupType,
    categoryType: lookupContextConfig.categoryType
  })
}

export function cacheReadOnlyLookupResult(state, toolCall, toolResultItem) {
  const lookupContextConfig = toLookupContextConfig(toolCall?.tool_name)
  if (!lookupContextConfig || !toolResultItem?.ok) {
    return state
  }

  const query = toolResultItem?.result?.query ?? toolCall?.arguments?.query ?? null
  const cacheKey = buildReadOnlyLookupCacheKey({
    domain: lookupContextConfig.domain,
    lookupType: lookupContextConfig.lookupType,
    categoryType: lookupContextConfig.categoryType,
    query
  })

  if (!cacheKey) {
    return state
  }

  state.readOnlyLookupCache.set(cacheKey, {
    ...(toolResultItem.result ?? {}),
    query,
    hitSource: 'lookup',
    lookupType: lookupContextConfig.lookupType,
    categoryType: lookupContextConfig.categoryType
  })

  return state
}

export function extractReadOnlyLookupContext(toolResult) {
  if (!toolResult?.results || !Array.isArray(toolResult.results)) {
    return []
  }

  return toolResult.results
    .filter((item) => item?.ok && item?.tool_name)
    .map((item) => {
      const lookupContextConfig = toLookupContextConfig(item.tool_name)
      if (!lookupContextConfig) {
        return null
      }

      return {
        domain: lookupContextConfig.domain,
        lookupType: lookupContextConfig.lookupType,
        categoryType: lookupContextConfig.categoryType,
        toolName: item.tool_name,
        query: item?.result?.query ?? null,
        items: Array.isArray(item?.result?.items) ? item.result.items : [],
        total: Number.isFinite(item?.result?.total) ? item.result.total : 0,
        hitSource: item?.result?.hitSource ?? 'lookup',
        normalizedQuery: normalizeLookupQuery(item?.result?.query ?? null)
      }
    })
    .filter(Boolean)
}

export function recordToolRoundState(state, toolResult) {
  const lookupContexts = extractReadOnlyLookupContext(toolResult)
  state.lastReadOnlyLookups = lookupContexts
  state.lastLookupCacheStats = lookupContexts.map((lookupContext) => ({
    domain: lookupContext.domain,
    lookupType: lookupContext.lookupType,
    categoryType: lookupContext.categoryType,
    query: lookupContext.query,
    normalizedQuery: lookupContext.normalizedQuery,
    hitSource: lookupContext.hitSource
  }))

  if (lookupContexts.length === 0) {
    return state
  }

  state.readOnlyLookupCount += lookupContexts.length
  for (const lookupContext of lookupContexts) {
    if (
      lookupContext.hitSource !== 'cache' &&
      lookupContext.domain &&
      Object.prototype.hasOwnProperty.call(state.lookupUsageByDomain, lookupContext.domain)
    ) {
      state.lookupUsageByDomain[lookupContext.domain] += 1
    }
  }
  return state
}
