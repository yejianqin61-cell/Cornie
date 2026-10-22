import express from 'express'

import { createLedgerService } from '../../electron/backend/ledger/service.js'
import { ledgerRoutes } from '../../electron/backend/ledger/routes.js'
import { jsonErrorHandler } from '../../electron/backend/http/middleware.js'
import { addExpense, listEntries, listLedgerCategories } from '../../src/renderer/api/ledger.js'
import { assert, createServiceHarness } from '../shared/service-harness.mjs'

const API_BASE = 'http://127.0.0.1:5174'
const MONTH = '2026-10'

async function withApi(store, fn) {
  const app = express()
  app.use(express.json())
  app.use('/api', ledgerRoutes({ ledger: createLedgerService(store) }))
  app.use((_req, res) => res.status(404).json({ error: 'route not found' }))
  app.use(jsonErrorHandler)

  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const realFetch = globalThis.fetch
  globalThis.fetch = (url, options) => realFetch(String(url).replace(API_BASE, base), options)
  try {
    await fn()
  } finally {
    globalThis.fetch = realFetch
    await new Promise((resolve) => server.close(resolve))
  }
}

async function testLedgerCategoryAndMonthlyEntryContract() {
  const harness = await createServiceHarness('phase2-ledger-contract')
  try {
    await withApi(harness.store, async () => {
      const categories = await listLedgerCategories({ type: 'expense' })
      const food = categories.items.find((item) => item.name === '餐饮')
      assert(food, 'expected expense category from real API', categories)

      const created = await addExpense({
        amount: 66,
        categoryId: food.id,
        categoryName: food.name,
        item: '午饭',
        occurredAt: '2026-10-22T12:00:00.000+08:00',
      })
      assert(created.entry.categoryId === food.id, 'expected stored category id', created)

      const listed = await listEntries({ from: `${MONTH}-01`, to: `${MONTH}-31` })
      assert(listed.entries.length === 1, 'expected one month entry', listed)
      assert(listed.entries[0].date === '2026-10-22', 'expected page date mapped from occurredAt', listed)
      assert(listed.entries[0].amount === 66, 'expected month amount', listed)
    })
  } finally {
    await harness.close()
  }
}

await testLedgerCategoryAndMonthlyEntryContract()
console.log('tests/services/phase2-ledger-contract.test.mjs: passed 1/1')
