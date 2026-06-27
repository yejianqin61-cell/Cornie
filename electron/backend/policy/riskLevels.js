import { getTool } from '../tools/registry.js'

function inferRiskLevel(toolName) {
  if (
    toolName.startsWith('settings.') ||
    toolName.startsWith('health.') ||
    toolName === 'conversation.get_day_record' ||
    toolName === 'conversation.search_day_records' ||
    toolName === 'observation.get_day_record'
  ) return 'low'
  if (toolName.startsWith('memory.')) return 'high'
  if (toolName.startsWith('memory_wiki.')) {
    if (
      toolName === 'memory_wiki.get_page' ||
      toolName === 'memory_wiki.list_pages' ||
      toolName === 'memory_wiki.search_topic_index' ||
      toolName === 'memory_wiki.list_topic_index'
    ) {
      return 'low'
    }
    return 'high'
  }
  if (toolName.startsWith('memory_index.')) return 'high'
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
