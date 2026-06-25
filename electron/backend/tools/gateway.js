import { normalizeToolResult } from '../agent/jsonProtocol.js'
import { getTool } from './registry.js'

export async function executeToolCalls(toolCalls, context = {}) {
  const results = []

  for (const call of toolCalls) {
    const tool = getTool(call.tool_name)
    if (!tool) {
      results.push(
        normalizeToolResult({
          toolName: call.tool_name,
          ok: false,
          error: {
            code: 'tool_not_found',
            message: `Tool "${call.tool_name}" is not registered`
          }
        })
      )
      continue
    }

    try {
      const execution = await tool.handler(call.arguments, context)
      results.push(
        normalizeToolResult({
          toolName: tool.name,
          ok: execution?.ok !== false,
          result: execution?.result,
          error: execution?.error
        })
      )
    } catch (error) {
      results.push(
        normalizeToolResult({
          toolName: tool.name,
          ok: false,
          error: {
            code: error?.code ?? 'tool_execution_failed',
            message: error?.message ?? 'Tool execution failed'
          }
        })
      )
    }
  }

  return {
    type: 'tool_result',
    results
  }
}
