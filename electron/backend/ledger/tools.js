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
    name: 'ledger_category.list_expense',
    description: '列出支出类目',
    riskLevel: 'low',
    handler: async () => ({ ok: true, result: ledger.listExpenseCategories() })
  })

  registerTool({
    name: 'ledger_category.list_income',
    description: '列出收入类目',
    riskLevel: 'low',
    handler: async () => ({ ok: true, result: ledger.listIncomeCategories() })
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
