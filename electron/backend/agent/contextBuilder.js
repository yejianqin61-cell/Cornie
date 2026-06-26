import { getMessagesByDate, listObservationLogs, listScheduleEntries, listTodoEntries } from '../../db.js'
import { buildCategorySummaryPayload } from './categorySummary.js'
import { buildMemorySearchSummary } from '../memory/search.js'
import { listTools } from '../tools/registry.js'

function summarizeRecentConversation(messages, limit = 8) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return '暂无最近对话摘要。'
  }

  return messages
    .slice(-limit)
    .map((item) => `${item.role === 'cornie' ? '铃湾' : '主人'}：${item.content}`)
    .join('\n')
}

function summarizeTools() {
  const tools = listTools()
  if (tools.length === 0) {
    return '当前没有已注册的工具。'
  }

  return tools.map((tool) => `- ${tool.name} [${tool.riskLevel}]：${tool.description}`).join('\n')
}

function summarizeTodos(store) {
  const items = listTodoEntries(store, { status: 'pending' }).slice(0, 5)
  if (items.length === 0) {
    return '当前没有未完成待办。'
  }

  return items.map((item) => `- ${item.title}${item.dueAt ? `（${item.dueAt}）` : ''}`).join('\n')
}

function summarizeSchedules(store) {
  const items = listScheduleEntries(store, { status: 'scheduled' }).slice(0, 5)
  if (items.length === 0) {
    return '当前没有近期日程。'
  }

  return items.map((item) => `- ${item.title} @ ${item.startAt}`).join('\n')
}

function summarizeObservations(store, date) {
  const items = listObservationLogs(store, { date, limit: 5 })
  if (items.length === 0) {
    return '当前没有观察日志。'
  }

  return items.map((item) => `- [${item.type}] ${item.title}`).join('\n')
}

export function buildConversationContext(store, { date }) {
  const messages = getMessagesByDate(store, date)
  const recentConversationSummary = summarizeRecentConversation(messages)
  const memorySummary = buildMemorySearchSummary(store, {
    query: messages.slice(-3).map((item) => item.content).join(' '),
    limit: 5
  })
  const categorySummary = buildCategorySummaryPayload(store)
  const todoItems = listTodoEntries(store, { status: 'pending' })
  const scheduleItems = listScheduleEntries(store, { status: 'scheduled' })
  const observationItems = listObservationLogs(store, { date, limit: 5 })
  const todoSummary = todoItems.length === 0
    ? '当前没有未完成待办。'
    : todoItems.slice(0, 5).map((item) => `- ${item.title}${item.dueAt ? `（${item.dueAt}）` : ''}`).join('\n')
  const scheduleSummary = scheduleItems.length === 0
    ? '当前没有近期日程。'
    : scheduleItems.slice(0, 5).map((item) => `- ${item.title} @ ${item.startAt}`).join('\n')
  const observationSummary = observationItems.length === 0
    ? '当前没有观察日志。'
    : observationItems.map((item) => `- [${item.type}] ${item.title}`).join('\n')
  const toolSummary = summarizeTools()

  return {
    date,
    recentConversationSummary,
    categorySummary: categorySummary.text,
    todoSummary,
    scheduleSummary,
    observationSummary,
    memorySummary,
    toolSummary,
    contextMeta: {
      recentConversationChars: recentConversationSummary.length,
      categorySummaryChars: categorySummary.text.length,
      todoSummaryChars: todoSummary.length,
      scheduleSummaryChars: scheduleSummary.length,
      observationSummaryChars: observationSummary.length,
      memorySummaryChars: memorySummary.length,
      toolSummaryChars: toolSummary.length,
      categoryCounts: categorySummary.counts,
      todoCount: todoItems.length,
      scheduleCount: scheduleItems.length,
      observationCount: observationItems.length,
      memoryHitCount: memorySummary === '暂无长期记忆。' ? 0 : memorySummary.split('\n').filter(Boolean).length
    }
  }
}
