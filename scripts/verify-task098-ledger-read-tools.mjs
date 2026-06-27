import { randomUUID } from 'node:crypto'
import { openDb } from '../electron/db.js'
import { registerTool, getTool } from '../electron/backend/tools/registry.js'
import { registerLedgerTools } from '../electron/backend/ledger/tools.js'
import { cleanupSqliteFile, createRuntimeSqlitePath } from './tmp-artifacts.mjs'

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

async function main() {
  const dbPath = await createRuntimeSqlitePath(`task098-verify-${randomUUID()}`)
  const store = await openDb(dbPath)

  try {
    registerLedgerTools(store, { registerTool })

    const addExpense = getTool('ledger.add_expense')
    const addIncome = getTool('ledger.add_income')
    const listByCategory = getTool('ledger.list_by_category')
    const listRecent = getTool('ledger.list_recent')
    const listByIdBatch = getTool('ledger.list_by_id_batch')

    assert(addExpense && addIncome && listByCategory && listRecent && listByIdBatch, 'missing task098 tools')

    const breakfast = (
      await addExpense.handler({
        amount: 25,
        categoryId: 'exp_food',
        categoryName: '餐饮',
        item: '早餐',
        sourceText: '今早吃早餐花了25',
        occurredAt: '2026-06-25T08:00:00.000Z'
      })
    ).result

    const lobster = (
      await addExpense.handler({
        amount: 388,
        categoryId: 'exp_food',
        categoryName: '餐饮',
        item: '龙虾',
        sourceText: '吃龙虾花了388',
        occurredAt: '2026-06-27T19:30:00.000Z'
      })
    ).result

    const taxi = (
      await addExpense.handler({
        amount: 42,
        categoryId: 'exp_transport',
        categoryName: '交通',
        item: '打车',
        sourceText: '打车回家42',
        occurredAt: '2026-06-27T20:00:00.000Z'
      })
    ).result

    const salary = (
      await addIncome.handler({
        amount: 5000,
        categoryId: 'inc_salary',
        categoryName: '工资',
        item: '6月工资',
        sourceText: '工资到账5000',
        occurredAt: '2026-06-26T10:00:00.000Z'
      })
    ).result

    const foodOnly = (
      await listByCategory.handler({
        categoryId: 'exp_food',
        type: 'expense'
      })
    ).result
    assert(Array.isArray(foodOnly) && foodOnly.length === 2, 'expected two expense records in food category', foodOnly)
    assert(foodOnly.every((item) => item.categoryId === 'exp_food'), 'expected food category only', foodOnly)

    const namedMatch = (
      await listByCategory.handler({
        categoryName: '工资',
        type: 'income'
      })
    ).result
    assert(namedMatch.length === 1 && namedMatch[0].id === salary.id, 'expected salary record matched by category name', namedMatch)

    const recentTwo = (await listRecent.handler({ limit: 2 })).result
    assert(Array.isArray(recentTwo) && recentTwo.length === 2, 'expected two recent records', recentTwo)
    assert(recentTwo[0].id === taxi.id, 'expected most recent record first', recentTwo)
    assert(recentTwo[1].id === lobster.id, 'expected second most recent record second', recentTwo)

    const batch = (
      await listByIdBatch.handler({
        ids: [lobster.id, 'missing-id', breakfast.id, lobster.id]
      })
    ).result
    assert(Array.isArray(batch) && batch.length === 2, 'expected missing ids ignored and duplicates deduped', batch)
    assert(batch[0].id === lobster.id, 'expected batch order preserve first valid id', batch)
    assert(batch[1].id === breakfast.id, 'expected batch order preserve remaining ids', batch)

    console.log('verify-task098-ledger-read-tools: passed')
  } finally {
    try {
      store.close()
    } catch {}
    cleanupSqliteFile(dbPath)
  }
}

main().catch((error) => {
  console.error('verify-task098-ledger-read-tools: failed')
  console.error(error?.message ?? error)
  if (error?.details !== undefined) {
    console.error(JSON.stringify(error.details, null, 2))
  }
  process.exit(1)
})
