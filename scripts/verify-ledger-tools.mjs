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
  const dbPath = `./tmp-task047-verify-${randomUUID()}.sqlite`
  const store = await openDb(dbPath)

  try {
    registerLedgerTools(store, { registerTool })

    const addExpense = getTool('ledger.add_expense')
    const getEntry = getTool('ledger.get_entry')
    const listToday = getTool('ledger.list_today')
    const listByRange = getTool('ledger.list_by_range')
    const updateEntry = getTool('ledger.update_entry')
    const deleteEntry = getTool('ledger.delete_entry')

    assert(addExpense && getEntry && listToday && listByRange && updateEntry && deleteEntry, 'missing ledger tools')

    const occurredAt = '2026-06-27T09:15:00.000Z'
    const created = (await addExpense.handler({
      amount: 88,
      categoryId: 'exp_shopping',
      categoryName: '购物',
      merchant: '宠物店',
      item: '猫粮',
      sourceText: '今天给猫买粮花了88块',
      occurredAt
    })).result

    assert(created?.id, 'expected created ledger entry id', created)

    const fetched = (await getEntry.handler({ id: created.id })).result
    assert(fetched?.amount === 88, 'expected fetched amount 88', fetched)
    assert(fetched?.item === '猫粮', 'expected fetched item 猫粮', fetched)

    const todayList = (await listToday.handler({ date: '2026-06-27' })).result
    assert(Array.isArray(todayList) && todayList.some((item) => item.id === created.id), 'expected today list hit', todayList)

    const rangeList = (await listByRange.handler({
      from: '2026-06-27T00:00:00.000Z',
      to: '2026-06-27T23:59:59.999Z'
    })).result
    assert(Array.isArray(rangeList) && rangeList.some((item) => item.id === created.id), 'expected range list hit', rangeList)

    const updated = (await updateEntry.handler({
      id: created.id,
      amount: 99,
      item: '猫粮和冻干',
      merchant: '宠物超市'
    })).result
    assert(updated?.amount === 99, 'expected updated amount 99', updated)
    assert(updated?.item === '猫粮和冻干', 'expected updated item', updated)
    assert(updated?.merchant === '宠物超市', 'expected updated merchant', updated)
    assert(updated?.categoryName === '购物', 'expected category preserved on update', updated)

    const removed = (await deleteEntry.handler({ id: created.id })).result
    assert(removed?.id === created.id, 'expected delete returns removed entry', removed)

    const afterDelete = (await getEntry.handler({ id: created.id })).result
    assert(afterDelete === null, 'expected entry missing after delete', afterDelete)

    console.log('verify-ledger-tools: passed')
  } finally {
    try {
      store.close()
    } catch {}
  }
}

main().catch((error) => {
  console.error('verify-ledger-tools: failed')
  console.error(error?.message ?? error)
  if (error?.details !== undefined) {
    console.error(JSON.stringify(error.details, null, 2))
  }
  process.exit(1)
})
