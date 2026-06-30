import { createObservationService } from './service.js'

export function registerObservationTools(store, { registerTool }) {
  const observation = createObservationService(store)

  registerTool({
    name: 'observation.add_note',
    description: '添加观察日志',
    riskLevel: 'medium',
    handler: async (args) => ({ ok: true, result: observation.addNote(args) })
  })

  registerTool({
    name: 'observation.update_note',
    description: '更新观察日志',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: observation.updateNote(args) })
  })

  registerTool({
    name: 'observation.delete_note',
    description: '删除观察日志',
    riskLevel: 'high',
    handler: async (args) => {
      observation.deleteNote(args)
      return { ok: true, result: null }
    }
  })

  registerTool({
    name: 'observation.get',
    description: '获取观察日志',
    riskLevel: 'low',
    handler: async ({ id }) => ({ ok: true, result: observation.get(id) })
  })

  registerTool({
    name: 'observation.list_today',
    description: '列出今天观察日志',
    riskLevel: 'low',
    handler: async (args = {}, context = {}) => ({
      ok: true,
      result: observation.listToday(args.date ?? context.date)
    })
  })

  registerTool({
    name: 'observation.list_by_range',
    description: '按范围列出观察日志',
    riskLevel: 'low',
    handler: async (args) => ({ ok: true, result: observation.listByRange(args) })
  })

  registerTool({
    name: 'observation.list_by_date',
    description: '按指定日期列出观察日志',
    riskLevel: 'low',
    handler: async ({ date } = {}, context = {}) => ({
      ok: true,
      result: observation.listByDate(date ?? context.date)
    })
  })

  registerTool({
    name: 'observation.recall_history',
    description: '按日期、主题、人物或关键词回查历史观察日志',
    riskLevel: 'low',
    handler: async (args = {}) => ({
      ok: true,
      result: observation.listByRecall(args)
    })
  })

  registerTool({
    name: 'observation.enqueue_compression_candidates',
    description: '为同日同主题的观察日志生成压缩治理候选',
    riskLevel: 'medium',
    handler: async (args = {}) => ({
      ok: true,
      result: await observation.enqueueCompressionCandidates(args)
    })
  })
}
