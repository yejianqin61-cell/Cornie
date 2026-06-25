import { getTool } from '../tools/registry.js'

function inferRiskLevel(toolName) {
  if (toolName.startsWith('memory.')) return 'high'
  if (toolName.includes('.delete') || toolName.includes('.remove') || toolName.includes('.update')) {
    return 'high'
  }
  if (toolName.includes('category')) return 'high'
  if (toolName.startsWith('ledger.') || toolName.startsWith('todo.') || toolName.startsWith('schedule.')) {
    return 'medium'
  }
  if (toolName.startsWith('observation.')) return 'medium'
  if (toolName.startsWith('get.') || toolName.startsWith('list.')) return 'low'
  return 'high'
}

export function getToolRiskLevel(toolName) {
  const registered = getTool(toolName)
  if (registered?.riskLevel) {
    return registered.riskLevel
  }
  return inferRiskLevel(toolName)
}
