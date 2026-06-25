import { getMessagesByDate } from '../../db.js'
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

  return tools
    .map((tool) => `- ${tool.name} [${tool.riskLevel}]：${tool.description}`)
    .join('\n')
}

export function buildConversationContext(store, { date }) {
  const messages = getMessagesByDate(store, date)

  return {
    date,
    recentConversationSummary: summarizeRecentConversation(messages),
    categorySummary: '当前类目摘要暂未接入，后续由收支与类目模块提供。',
    todoSummary: '当前没有待办摘要可用。',
    scheduleSummary: '当前没有近期日程摘要可用。',
    observationSummary: '当前没有观察日志摘要可用。',
    memorySummary: '当前没有长期记忆摘要可用。',
    toolSummary: summarizeTools()
  }
}
