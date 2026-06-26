import { getTool } from '../tools/registry.js'

function inferRiskLevel(toolName) {
  if (toolName.startsWith('settings.') || toolName.startsWith('health.')) return 'low'
  if (toolName.startsWith('memory.')) return 'high'
  if (toolName.includes('.delete') || toolName.includes('.remove') || toolName.includes('.update')) {
    return 'high'
  }
  if (toolName.includes('category')) return 'high'
  if (
    toolName.startsWith('ledger.') ||
    toolName.startsWith('todo.') ||
    toolName.startsWith('schedule.') ||
    toolName.startsWith('observation.')
  ) {
    if (toolName.includes('.get') || toolName.includes('.list')) return 'low'
    return 'medium'
  }
  return 'high'
}

export function getToolRiskLevel(toolName) {
  const registered = getTool(toolName)
  if (registered?.riskLevel) {
    return registered.riskLevel
  }
  return inferRiskLevel(toolName)
}
