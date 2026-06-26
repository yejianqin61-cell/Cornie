import { getModelConfig } from '../model/config.js'
import { checkHealth as checkModelHealth } from '../model/deepseek/client.js'

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

export function registerSystemTools(_store, { registerTool }) {
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
}
