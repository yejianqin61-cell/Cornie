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
    lookupUsageByDomain: {
      ledger: 0,
      todo: 0,
      schedule: 0
    }
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
        total: Number.isFinite(item?.result?.total) ? item.result.total : 0
      }
    })
    .filter(Boolean)
}

export function recordToolRoundState(state, toolResult) {
  const lookupContexts = extractReadOnlyLookupContext(toolResult)
  if (lookupContexts.length === 0) {
    return state
  }

  state.readOnlyLookupCount += lookupContexts.length
  state.lastReadOnlyLookups = lookupContexts
  for (const lookupContext of lookupContexts) {
    if (lookupContext.domain && Object.prototype.hasOwnProperty.call(state.lookupUsageByDomain, lookupContext.domain)) {
      state.lookupUsageByDomain[lookupContext.domain] += 1
    }
  }
  return state
}
