import { getMessagesByDate, listScheduleEntries, listTodoEntries } from '../../db.js'
import { buildCategorySummaryPayload } from './categorySummary.js'
import { listTools } from '../tools/registry.js'
import { buildWikiContext } from './wikiContext.js'
import { createObservationService } from '../observation/service.js'
import { PROMPT_LOADING_POLICY, buildPromptLoadingPolicySummary } from './promptLoadingPolicy.js'

export const CONVERSATION_CONTEXT_BUDGETS = Object.freeze({
  recentConversationMessages: PROMPT_LOADING_POLICY.recentConversationSummaryMessages,
  todoSummaryItems: PROMPT_LOADING_POLICY.todoSummaryItems,
  scheduleSummaryItems: PROMPT_LOADING_POLICY.scheduleSummaryItems,
  observationSummaryItems: PROMPT_LOADING_POLICY.observationSummaryItems,
  memoryPageLimit: PROMPT_LOADING_POLICY.memoryPageLimit,
  topicLimit: PROMPT_LOADING_POLICY.topicLimit,
  chatRecallDateLimit: PROMPT_LOADING_POLICY.chatRecallDateLimit,
  observationRecallLimit: PROMPT_LOADING_POLICY.observationRecallLimit
})

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

export async function buildConversationContext(store, { date, baseDir = process.cwd() }) {
  const observation = createObservationService(store)
  const messages = getMessagesByDate(store, date)
  const recentConversationSummary = summarizeRecentConversation(messages, CONVERSATION_CONTEXT_BUDGETS.recentConversationMessages)
  const wikiContext = await buildWikiContext(store, {
    date,
    baseDir,
    query: messages.slice(-3).map((item) => item.content).join(' '),
    pageLimit: CONVERSATION_CONTEXT_BUDGETS.memoryPageLimit,
    topicLimit: CONVERSATION_CONTEXT_BUDGETS.topicLimit
  })
  const categorySummary = buildCategorySummaryPayload(store)
  const todoItems = listTodoEntries(store, { status: 'pending' })
  const scheduleItems = listScheduleEntries(store, { status: 'scheduled' })
  const observationItems = observation.listTodayForConversation(date)
  const todoSummary = todoItems.length === 0
    ? '当前没有未完成待办。'
    : todoItems
        .slice(0, CONVERSATION_CONTEXT_BUDGETS.todoSummaryItems)
        .map((item) => `- ${item.title}${item.dueAt ? `（${item.dueAt}）` : ''}`)
        .join('\n')
  const scheduleSummary = scheduleItems.length === 0
    ? '当前没有近期日程。'
    : scheduleItems
        .slice(0, CONVERSATION_CONTEXT_BUDGETS.scheduleSummaryItems)
        .map((item) => `- ${item.title} @ ${item.startAt}`)
        .join('\n')
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
    memorySummary: wikiContext.memorySummary,
    topicSummary: wikiContext.topicSummary,
    chatRecallSummary: wikiContext.chatSummary,
    observationRecallSummary: wikiContext.observationSummary,
    toolSummary,
    loadPolicy: {
      defaultInjectedLayers: [
        'recent_conversation_summary',
        'category_summary',
        'todo_summary',
        'schedule_summary',
        'today_observation_summary',
        'memory_summary',
        'topic_summary',
        'tool_summary'
      ],
      recallOnlyLayers: [
        'chat_recall_summary',
        'observation_recall_summary'
      ],
      budgets: CONVERSATION_CONTEXT_BUDGETS,
      matrix: buildPromptLoadingPolicySummary()
    },
    contextMeta: {
      recentConversationChars: recentConversationSummary.length,
      categorySummaryChars: categorySummary.text.length,
      todoSummaryChars: todoSummary.length,
      scheduleSummaryChars: scheduleSummary.length,
      observationSummaryChars: observationSummary.length,
      memorySummaryChars: wikiContext.memorySummary.length,
      topicSummaryChars: wikiContext.topicSummary.length,
      chatRecallSummaryChars: wikiContext.chatSummary.length,
      observationRecallSummaryChars: wikiContext.observationSummary.length,
      toolSummaryChars: toolSummary.length,
      categoryCounts: categorySummary.counts,
      todoCount: todoItems.length,
      scheduleCount: scheduleItems.length,
      observationCount: observationItems.length,
      observationPromptPolicy: observation.getPromptPolicy(),
      observationPromptPolicySummary: observation.getPromptPolicySummary(),
      memoryHitCount: wikiContext.selectedPages.length,
      topicHitCount: wikiContext.selectedTopics.length,
      chatRecallHitCount: wikiContext.chatHits.length,
      observationRecallHitCount: wikiContext.todayObservations.length
    }
  }
}
