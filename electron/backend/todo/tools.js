import { toCategoryListResult } from '../category/readModel.js'
import { createTodoService } from './service.js'

export function registerTodoTools(store, { registerTool }) {
  const todo = createTodoService(store)

  registerTool({
    name: 'todo.create',
    description: '创建待办',
    riskLevel: 'medium',
    handler: async (args) => ({ ok: true, result: todo.create(args) })
  })
  registerTool({
    name: 'todo.update',
    description: '更新待办',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: todo.update(args) })
  })
  registerTool({
    name: 'todo.complete',
    description: '完成待办',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: todo.complete(args) })
  })
  registerTool({
    name: 'todo.delete',
    description: '删除待办',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: todo.delete(args) })
  })
  registerTool({
    name: 'todo.get',
    description: '获取待办',
    riskLevel: 'low',
    handler: async ({ id }) => ({ ok: true, result: todo.get(id) })
  })
  registerTool({
    name: 'todo.list_today',
    description: '列出今天待办',
    riskLevel: 'low',
    handler: async () => ({ ok: true, result: todo.listToday() })
  })
  registerTool({
    name: 'todo.list_by_range',
    description: '按范围列出待办',
    riskLevel: 'low',
    handler: async (args) => ({ ok: true, result: todo.listByRange(args) })
  })
  registerTool({
    name: 'todo_category.list',
    description: '只读查询当前全部待办类目，适合类目补查，无需确认',
    riskLevel: 'low',
    handler: async (args = {}) => ({
      ok: true,
      result: toCategoryListResult(todo.listCategories(), {
        query: args.query ?? null
      })
    })
  })
  registerTool({
    name: 'todo_category.create',
    description: '创建待办类目',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: todo.createCategory(args) })
  })
  registerTool({
    name: 'todo_category.update',
    description: '更新待办类目',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: todo.updateCategory(args) })
  })
  registerTool({
    name: 'todo_category.delete',
    description: '停用待办类目',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: todo.deleteCategory(args) })
  })
}
