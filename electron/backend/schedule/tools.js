import { toCategoryListResult } from '../category/readModel.js'
import { createScheduleService } from './service.js'

export function registerScheduleTools(store, { registerTool }) {
  const schedule = createScheduleService(store)

  registerTool({
    name: 'schedule.create',
    description: '创建日程',
    riskLevel: 'medium',
    handler: async (args) => ({ ok: true, result: schedule.create(args) })
  })
  registerTool({
    name: 'schedule.update',
    description: '更新日程',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: schedule.update(args) })
  })
  registerTool({
    name: 'schedule.cancel',
    description: '取消日程',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: schedule.cancel(args) })
  })
  registerTool({
    name: 'schedule.delete',
    description: '删除日程',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: schedule.delete(args) })
  })
  registerTool({
    name: 'schedule.get',
    description: '获取日程',
    riskLevel: 'low',
    handler: async ({ id }) => ({ ok: true, result: schedule.get(id) })
  })
  registerTool({
    name: 'schedule.list_today',
    description: '列出今天日程',
    riskLevel: 'low',
    handler: async () => ({ ok: true, result: schedule.listToday() })
  })
  registerTool({
    name: 'schedule.list_by_range',
    description: '按范围列出日程',
    riskLevel: 'low',
    handler: async (args) => ({ ok: true, result: schedule.listByRange(args) })
  })
  registerTool({
    name: 'schedule_category.list',
    description: '只读查询当前全部日程类目，适合类目补查，无需确认',
    riskLevel: 'low',
    handler: async (args = {}) => ({
      ok: true,
      result: toCategoryListResult(schedule.listCategories(), {
        query: args.query ?? null
      })
    })
  })
  registerTool({
    name: 'schedule_category.get',
    description: '读取单个日程类目详情',
    riskLevel: 'low',
    handler: async ({ id }) => ({ ok: true, result: schedule.getCategory(id) })
  })
  registerTool({
    name: 'schedule_category.create',
    description: '创建日程类目',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: schedule.createCategory(args) })
  })
  registerTool({
    name: 'schedule_category.update',
    description: '更新日程类目',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: schedule.updateCategory(args) })
  })
  registerTool({
    name: 'schedule_category.delete',
    description: '停用日程类目',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: schedule.deleteCategory(args) })
  })
  registerTool({
    name: 'schedule_category.restore',
    description: '恢复已停用的日程类目',
    riskLevel: 'high',
    handler: async ({ id }) => ({ ok: true, result: schedule.restoreCategory({ id }) })
  })
  registerTool({
    name: 'schedule_category.reorder',
    description: '调整日程类目排序',
    riskLevel: 'high',
    handler: async ({ id, sortOrder }) => ({
      ok: true,
      result: schedule.reorderCategory({ id, sortOrder })
    })
  })
}
