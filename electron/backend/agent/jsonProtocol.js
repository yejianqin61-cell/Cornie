function protocolError(message, details) {
  const error = new Error(message)
  error.code = 'invalid_model_protocol'
  error.details = details
  return error
}

function extractCodeBlockJson(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return match ? match[1].trim() : null
}

function extractBalancedJson(text) {
  const start = text.search(/[\[{]/)
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const char = text[index]

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{' || char === '[') {
      depth += 1
      continue
    }

    if (char === '}' || char === ']') {
      depth -= 1
      if (depth === 0) {
        return text.slice(start, index + 1).trim()
      }
    }
  }

  return null
}

function normalizeToolCall(item, index) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw protocolError('tool_calls item must be an object', { index })
  }

  if (typeof item.tool_name !== 'string' || !item.tool_name.trim()) {
    throw protocolError('tool_name is required', { index })
  }

  if (!item.arguments || typeof item.arguments !== 'object' || Array.isArray(item.arguments)) {
    throw protocolError('tool arguments must be an object', { index, toolName: item.tool_name })
  }

  validateCategoryArguments(item.tool_name, item.arguments, index)

  return {
    tool_name: item.tool_name.trim(),
    arguments: item.arguments
  }
}

function isCategoryDomainTool(toolName) {
  return [
    'ledger.add_expense',
    'ledger.add_income',
    'todo.create',
    'todo.update',
    'schedule.create',
    'schedule.update'
  ].includes(toolName)
}

function normalizeCategoryString(value) {
  if (value == null) {
    return null
  }
  const normalized = String(value).trim()
  return normalized ? normalized : null
}

function validateCategoryArguments(toolName, argumentsPayload, index) {
  if (!isCategoryDomainTool(toolName)) {
    return
  }

  const categoryId = normalizeCategoryString(argumentsPayload.categoryId ?? argumentsPayload.category_id)
  const categoryName = normalizeCategoryString(argumentsPayload.categoryName ?? argumentsPayload.category_name)
  const proposedCategoryName = normalizeCategoryString(
    argumentsPayload.proposedCategoryName ??
      argumentsPayload.proposed_category_name ??
      argumentsPayload.categoryProposalName
  )
  const needsNewCategory = argumentsPayload.needsNewCategory === true

  if ((categoryId || categoryName) && needsNewCategory) {
    throw protocolError('category mapping must not mix existing category with needsNewCategory=true', {
      index,
      toolName
    })
  }

  if (needsNewCategory && !proposedCategoryName) {
    throw protocolError('proposedCategoryName is required when needsNewCategory=true', {
      index,
      toolName
    })
  }

  if (!needsNewCategory && proposedCategoryName) {
    throw protocolError('proposedCategoryName must not be set without needsNewCategory=true', {
      index,
      toolName
    })
  }
}

function normalizeToolResultItem(item, index) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw protocolError('results item must be an object', { index })
  }

  if (typeof item.tool_name !== 'string' || !item.tool_name.trim()) {
    throw protocolError('result.tool_name is required', { index })
  }

  if (typeof item.ok !== 'boolean') {
    throw protocolError('result.ok must be boolean', { index, toolName: item.tool_name })
  }

  return {
    tool_name: item.tool_name.trim(),
    ok: item.ok,
    result: item.result,
    error: item.error
  }
}

function normalizeProtocolEnvelope(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw protocolError('model output must be a JSON object')
  }

  if (payload.type === 'reply') {
    if (typeof payload.assistant_reply !== 'string' || !payload.assistant_reply.trim()) {
      throw protocolError('assistant_reply is required for reply')
    }

    return {
      type: 'reply',
      assistant_reply: payload.assistant_reply.trim()
    }
  }

  if (payload.type === 'tool_call') {
    if (typeof payload.assistant_reply !== 'string' || !payload.assistant_reply.trim()) {
      throw protocolError('assistant_reply is required for tool_call')
    }

    if (!Array.isArray(payload.tool_calls) || payload.tool_calls.length === 0) {
      throw protocolError('tool_calls must be a non-empty array')
    }

    return {
      type: 'tool_call',
      assistant_reply: payload.assistant_reply.trim(),
      tool_calls: payload.tool_calls.map((item, index) => normalizeToolCall(item, index))
    }
  }

  if (payload.type === 'tool_result') {
    if (!Array.isArray(payload.results)) {
      throw protocolError('results must be an array')
    }

    return {
      type: 'tool_result',
      results: payload.results.map((item, index) => normalizeToolResultItem(item, index))
    }
  }

  throw protocolError('unsupported protocol type', { type: payload.type })
}

export function parseModelJson(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw protocolError('model output is empty')
  }

  const candidates = [text.trim(), extractCodeBlockJson(text), extractBalancedJson(text)].filter(Boolean)
  const errors = []
  const seen = new Set()

  for (const candidate of candidates) {
    if (seen.has(candidate)) continue
    seen.add(candidate)

    try {
      return normalizeProtocolEnvelope(JSON.parse(candidate))
    } catch (error) {
      errors.push(error)
    }
  }

  const reason = errors[errors.length - 1]
  throw protocolError('failed to parse model JSON protocol', {
    reason: reason?.message ?? 'unknown',
    rawText: text
  })
}

export function buildJsonRepairPrompt(rawText) {
  return [
    '你上一条回复不符合约定协议。',
    '请只输出一个合法 JSON 对象，不要输出解释、前后缀文字、Markdown 代码块。',
    '允许的 type 只有 reply 或 tool_call。',
    'reply 结构: {"type":"reply","assistant_reply":"..."}',
    'tool_call 结构: {"type":"tool_call","assistant_reply":"...","tool_calls":[{"tool_name":"tool.name","arguments":{}}]}',
    '若 arguments 涉及类目映射，不要同时输出 categoryId/categoryName 和 needsNewCategory=true；needsNewCategory=true 时必须带 proposedCategoryName。',
    '以下是你上一条原始回复，请修复成合法 JSON：',
    rawText
  ].join('\n')
}

export function normalizeToolResult({ toolName, ok, result, error }) {
  return {
    tool_name: String(toolName),
    ok: Boolean(ok),
    result: result === undefined ? null : result,
    error: ok
      ? null
      : {
          code: typeof error?.code === 'string' ? error.code : 'tool_execution_failed',
          message: typeof error?.message === 'string' ? error.message : 'Tool execution failed'
        }
  }
}
