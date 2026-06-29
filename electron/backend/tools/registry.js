import { assertToolDefinition } from './types.js'

const toolRegistry = new Map()

export function registerTool(definition) {
  const normalized = assertToolDefinition(definition)
  toolRegistry.set(normalized.name, normalized)
  return normalized
}

export function getTool(name) {
  return toolRegistry.get(name) ?? null
}

export function listTools() {
  return [...toolRegistry.values()].map(({ handler, ...tool }) => tool)
}

export function clearTools() {
  toolRegistry.clear()
}
