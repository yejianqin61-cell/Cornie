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
