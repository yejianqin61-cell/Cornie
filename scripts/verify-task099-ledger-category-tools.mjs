import { randomUUID } from 'node:crypto'
import { openDb } from '../electron/db.js'
import { registerTool, getTool } from '../electron/backend/tools/registry.js'
import { registerLedgerTools } from '../electron/backend/ledger/tools.js'

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

async function main() {
  const dbPath = `./tmp-task099-verify-${randomUUID()}.sqlite`
  const store = await openDb(dbPath)

  try {
    registerLedgerTools(store, { registerTool })

    const getCategory = getTool('ledger_category.get')
    const listAll = getTool('ledger_category.list_all')
    const deleteCategory = getTool('ledger_category.delete')
    const restoreCategory = getTool('ledger_category.restore')

    assert(getCategory && listAll && deleteCategory && restoreCategory, 'missing task099 tools')

    const expenseCategory = (await getCategory.handler({ id: 'exp_food' })).result
    assert(expenseCategory?.id === 'exp_food', 'expected exp_food category', expenseCategory)
    assert(expenseCategory?.type === 'expense', 'expected expense category type', expenseCategory)

    const beforeDelete = (await listAll.handler({})).result
    assert(Array.isArray(beforeDelete?.items), 'expected list_all items array', beforeDelete)
    assert(beforeDelete.items.some((item) => item.id === 'exp_food' && item.type === 'expense'), 'expected expense category in unified list', beforeDelete)
    assert(beforeDelete.items.some((item) => item.id === 'inc_salary' && item.type === 'income'), 'expected income category in unified list', beforeDelete)

    const deleted = (
      await deleteCategory.handler({
        id: 'exp_food',
        type: 'expense',
        name: '餐饮'
      })
    ).result
    assert(deleted?.isActive === false, 'expected category disabled after delete', deleted)

    const afterDelete = (await listAll.handler({})).result
    const disabledFood = afterDelete.items.find((item) => item.id === 'exp_food')
    assert(disabledFood?.status === 'disabled', 'expected disabled category still visible in list_all', afterDelete)

    const restored = (await restoreCategory.handler({ id: 'exp_food' })).result
    assert(restored?.isActive === true, 'expected restored category active', restored)

    const afterRestore = (await listAll.handler({})).result
    const restoredFood = afterRestore.items.find((item) => item.id === 'exp_food')
    assert(restoredFood?.status === 'active', 'expected restored category visible as active', afterRestore)

    console.log('verify-task099-ledger-category-tools: passed')
  } finally {
    try {
      store.close()
    } catch {}
  }
}

main().catch((error) => {
  console.error('verify-task099-ledger-category-tools: failed')
  console.error(error?.message ?? error)
  if (error?.details !== undefined) {
    console.error(JSON.stringify(error.details, null, 2))
  }
  process.exit(1)
})
