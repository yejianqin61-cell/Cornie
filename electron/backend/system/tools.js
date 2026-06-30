import { getModelConfig } from '../model/config.js'
import { checkHealth as checkModelHealth } from '../model/deepseek/client.js'
import { createChatlogService } from '../chatlog/service.js'
import { createObservationService } from '../observation/service.js'

function buildRuntimeContext() {
  const config = getModelConfig()
  return {
    date: new Date().toISOString().slice(0, 10),
    provider: config.provider,
    model: config.model,
    configured: Boolean(config.apiKey),
    capabilities: {
      conversation: true,
      toolCalling: true,
      confirmationFlow: true,
      categoryMapping: true,
      memory: true,
      observation: true
    }
  }
}

export function registerSystemTools(store, { registerTool }) {
  const chatlog = createChatlogService(store)
  const observation = createObservationService(store)

  registerTool({
    name: 'settings.get_runtime_context',
    description: '读取当前运行上下文和能力摘要',
    riskLevel: 'low',
    handler: async () => ({
      ok: true,
      result: buildRuntimeContext()
    })
  })

  registerTool({
    name: 'health.get_model_status',
    description: '读取当前模型配置与健康状态',
    riskLevel: 'low',
    handler: async () => ({
      ok: true,
      result: await checkModelHealth()
    })
  })

  registerTool({
    name: 'conversation.get_day_record',
    description: '读取指定日期的聊天记录',
    riskLevel: 'low',
    handler: async ({ date } = {}, context = {}) => ({
      ok: true,
      result: chatlog.getByDate(date ?? context.date)
    })
  })

  registerTool({
    name: 'conversation.search_day_records',
    description: '按关键词查询命中的聊天日期',
    riskLevel: 'low',
    handler: async ({ keyword, month } = {}) => ({
      ok: true,
      result: chatlog.searchDatesByKeyword(keyword, { month })
    })
  })

  registerTool({
    name: 'conversation.search_message_snippets',
    description: '跨日期按关键词检索聊天消息片段，返回日期、消息 id 与命中摘要',
    riskLevel: 'low',
    handler: async ({ keyword, month, scope, limit, cursor } = {}) => ({
      ok: true,
      result: chatlog.searchMessageSnippets(keyword, { month, scope, limit, cursor })
    })
  })

  registerTool({
    name: 'conversation.list_history_dates',
    description: '按全部历史、最近30天或指定月份列出聊天日期归档',
    riskLevel: 'low',
    handler: async ({ month, scope, query, limit, cursor } = {}) => ({
      ok: true,
      result: chatlog.listDates({ month, scope, query, limit, cursor })
    })
  })

  registerTool({
    name: 'conversation.get_day_page',
    description: '分页读取指定日期的聊天记录，支持关键词过滤和 beforeId 补读',
    riskLevel: 'low',
    handler: async ({ date, cursor, limit, query, beforeId } = {}, context = {}) => ({
      ok: true,
      result: chatlog.getDayPage(date ?? context.date, { cursor, limit, query, beforeId })
    })
  })

  registerTool({
    name: 'conversation.export_month_record',
    description: '导出指定月份的聊天记录归档',
    riskLevel: 'low',
    handler: async ({ month, format } = {}) => ({
      ok: true,
      result: chatlog.exportByMonth(month, { format })
    })
  })

  registerTool({
    name: 'conversation.export_day_record',
    description: '导出指定日期的聊天记录归档',
    riskLevel: 'low',
    handler: async ({ date, format } = {}, context = {}) => ({
      ok: true,
      result: chatlog.exportByDate(date ?? context.date, { format })
    })
  })

  registerTool({
    name: 'observation.get_day_record',
    description: '读取指定日期的观察日志',
    riskLevel: 'low',
    handler: async ({ date } = {}, context = {}) => ({
      ok: true,
      result: {
        date: date ?? context.date,
        items: observation.listByDate(date ?? context.date)
      }
    })
  })
}
