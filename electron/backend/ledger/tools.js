import { toCategoryListResult } from '../category/readModel.js'
import { createLedgerService } from './service.js'

export function registerLedgerTools(store, { registerTool }) {
  const ledger = createLedgerService(store)

  registerTool({
    name: 'ledger.add_expense',
    description: '记录一笔支出',
    riskLevel: 'medium',
    handler: async (args) => ({ ok: true, result: ledger.addExpense(args) })
  })

  registerTool({
    name: 'ledger.add_income',
    description: '记录一笔收入',
    riskLevel: 'medium',
    handler: async (args) => ({ ok: true, result: ledger.addIncome(args) })
  })

  registerTool({
    name: 'ledger.get_entry',
    description: '获取单条收支记录',
    riskLevel: 'low',
    handler: async ({ id }) => ({ ok: true, result: ledger.getEntry(id) })
  })

  registerTool({
    name: 'ledger.list_today',
    description: '列出今日收支记录',
    riskLevel: 'low',
    handler: async (args = {}) => ({ ok: true, result: ledger.listToday(args) })
  })

  registerTool({
    name: 'ledger.list_by_range',
    description: '按时间范围列出收支记录',
    riskLevel: 'low',
    handler: async (args = {}) => ({ ok: true, result: ledger.listByRange(args) })
  })

  registerTool({
    name: 'ledger.list_by_category',
    description: '按类目查看收支记录',
    riskLevel: 'low',
    handler: async (args = {}) => ({ ok: true, result: ledger.listByCategory(args) })
  })

  registerTool({
    name: 'ledger.list_recent',
    description: '查看最近 N 条收支记录',
    riskLevel: 'low',
    handler: async (args = {}) => ({ ok: true, result: ledger.listRecent(args) })
  })

  registerTool({
    name: 'ledger.list_by_id_batch',
    description: '批量按 id 读取收支记录',
    riskLevel: 'low',
    handler: async (args = {}) => ({ ok: true, result: ledger.listByIdBatch(args) })
  })

  registerTool({
    name: 'ledger.update_entry',
    description: '更新收支记录',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: ledger.updateEntry(args) })
  })

  registerTool({
    name: 'ledger.delete_entry',
    description: '删除收支记录',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: ledger.deleteEntry(args) })
  })

  registerTool({
    name: 'ledger_category.list_expense',
    description: '只读查询当前全部支出类目，适合类目补查，无需确认',
    riskLevel: 'low',
    handler: async (args = {}) => ({
      ok: true,
      result: toCategoryListResult(ledger.listExpenseCategories(), {
        includeType: true,
        query: args.query ?? null
      })
    })
  })

  registerTool({
    name: 'ledger_category.list_income',
    description: '只读查询当前全部收入类目，适合类目补查，无需确认',
    riskLevel: 'low',
    handler: async (args = {}) => ({
      ok: true,
      result: toCategoryListResult(ledger.listIncomeCategories(), {
        includeType: true,
        query: args.query ?? null
      })
    })
  })

  registerTool({
    name: 'ledger_category.create_expense',
    description: '新建支出类目',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: ledger.createExpenseCategory(args) })
  })

  registerTool({
    name: 'ledger_category.create_income',
    description: '新建收入类目',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: ledger.createIncomeCategory(args) })
  })

  registerTool({
    name: 'ledger_category.update',
    description: '更新收支类目',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: ledger.updateCategory(args) })
  })

  registerTool({
    name: 'ledger_category.delete',
    description: '停用收支类目',
    riskLevel: 'high',
    handler: async ({ id, type, name, sortOrder }) => {
      const result = ledger.updateCategory({ id, type, name, sortOrder, isActive: false })
      return { ok: true, result }
    }
  })
}
