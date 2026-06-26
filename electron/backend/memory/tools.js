import { createMemoryService } from './service.js'

export function registerMemoryTools(store, { registerTool }) {
  const memory = createMemoryService(store)

  registerTool({
    name: 'memory.create',
    description: '创建长期记忆',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: memory.create(args) })
  })

  registerTool({
    name: 'memory.update',
    description: '更新长期记忆',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: memory.update(args) })
  })

  registerTool({
    name: 'memory.delete',
    description: '删除长期记忆',
    riskLevel: 'high',
    handler: async (args) => {
      memory.delete(args)
      return { ok: true, result: null }
    }
  })

  registerTool({
    name: 'memory.list_active',
    description: '列出活跃长期记忆',
    riskLevel: 'low',
    handler: async (args) => ({ ok: true, result: memory.listActive(args) })
  })

  registerTool({
    name: 'memory.search',
    description: '搜索长期记忆',
    riskLevel: 'low',
    handler: async (args) => ({ ok: true, result: memory.search(args) })
  })
}
