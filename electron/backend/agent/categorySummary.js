import { createLedgerService } from '../ledger/service.js'
import { createTodoService } from '../todo/service.js'
import { createScheduleService } from '../schedule/service.js'

function formatCategoryItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '无'
  }

  return items.map((item) => `${item.id}:${item.name}`).join('、')
}

function buildCategorySnapshot(store) {
  const ledgerService = createLedgerService(store)
  const todoService = createTodoService(store)
  const scheduleService = createScheduleService(store)

  return {
    ledger: {
      income: ledgerService.listIncomeCategories(),
      expense: ledgerService.listExpenseCategories()
    },
    todo: todoService.listCategories(),
    schedule: scheduleService.listCategories()
  }
}

export function buildCategorySummary(store) {
  const snapshot = buildCategorySnapshot(store)

  return [
    '收支类目：',
    `- income: ${formatCategoryItems(snapshot.ledger.income)}`,
    `- expense: ${formatCategoryItems(snapshot.ledger.expense)}`,
    '',
    `待办类目：${formatCategoryItems(snapshot.todo)}`,
    `日程类目：${formatCategoryItems(snapshot.schedule)}`
  ].join('\n')
}
