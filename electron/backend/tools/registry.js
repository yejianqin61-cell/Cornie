import { assertToolDefinition } from './types.js'

const toolRegistry = new Map()

export function registerTool(definition) {
  const normalized = assertToolDefinition(definition)
  const existing = toolRegistry.get(normalized.name)
  if (existing) {
    // BE-08：重名注册直接报错（与 domainRegistry 重名抛错行为一致），避免静默覆盖。
    const previous = String(existing?.description || '').split('\n')[0] || 'unknown'
    const incoming = String(normalized.description || '').split('\n')[0] || 'unknown'
    throw new Error(
      `duplicate tool registration: ${normalized.name} (previous: "${previous}", incoming: "${incoming}")`
    )
  }
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
