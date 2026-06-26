const READ_ONLY_CATEGORY_LOOKUP_TOOLS = new Set([
  'ledger_category.list_expense',
  'ledger_category.list_income',
  'todo_category.list',
  'schedule_category.list'
])

function toLookupType(toolName) {
  if (toolName === 'ledger_category.list_expense' || toolName === 'ledger_category.list_income') {
    return 'ledger_category'
  }
  if (toolName === 'todo_category.list') {
    return 'todo_category'
  }
  if (toolName === 'schedule_category.list') {
    return 'schedule_category'
  }
  if (toolName === 'todo.list_today' || toolName === 'todo.list_by_range' || toolName === 'todo.get') {
    return 'todo_items'
  }
  if (
    toolName === 'schedule.list_today' ||
    toolName === 'schedule.list_by_range' ||
    toolName === 'schedule.get'
  ) {
    return 'schedule_items'
  }
  return null
}

export function createToolRoundState() {
  return {
    readOnlyLookupUsed: false,
    readOnlyLookupCount: 0,
    lastReadOnlyLookups: []
  }
}

export function isReadOnlyLookupTool(toolName) {
  return READ_ONLY_CATEGORY_LOOKUP_TOOLS.has(toolName)
}

export function extractReadOnlyLookupContext(toolResult) {
  if (!toolResult?.results || !Array.isArray(toolResult.results)) {
    return []
  }

  return toolResult.results
    .filter((item) => item?.ok && item?.tool_name)
    .map((item) => {
      const lookupType = toLookupType(item.tool_name)
      if (!lookupType) {
        return null
      }

      return {
        lookupType,
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

  state.readOnlyLookupUsed = true
  state.readOnlyLookupCount += lookupContexts.length
  state.lastReadOnlyLookups = lookupContexts
  return state
}
