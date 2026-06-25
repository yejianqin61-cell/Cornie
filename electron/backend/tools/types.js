export const TOOL_RISK_LEVELS = ['low', 'medium', 'high']

export function assertToolDefinition(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new Error('tool definition must be an object')
  }

  if (typeof definition.name !== 'string' || !definition.name.trim()) {
    throw new Error('tool definition name is required')
  }

  if (typeof definition.description !== 'string' || !definition.description.trim()) {
    throw new Error(`tool "${definition.name}" description is required`)
  }

  if (!TOOL_RISK_LEVELS.includes(definition.riskLevel)) {
    throw new Error(`tool "${definition.name}" riskLevel must be one of ${TOOL_RISK_LEVELS.join(', ')}`)
  }

  if (typeof definition.handler !== 'function') {
    throw new Error(`tool "${definition.name}" handler must be a function`)
  }

  return {
    name: definition.name.trim(),
    description: definition.description.trim(),
    riskLevel: definition.riskLevel,
    handler: definition.handler
  }
}
