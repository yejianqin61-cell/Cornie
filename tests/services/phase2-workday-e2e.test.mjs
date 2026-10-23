import { createServer } from '../../electron/server.js'
import { clearTools } from '../../electron/backend/tools/registry.js'
import { assert, createServiceHarness } from '../shared/service-harness.mjs'
import { createTestSecretStore } from '../shared/secret-store.mjs'

const DATE = '2026-10-22'

async function withServer(harness, run) {
  const app = await createServer({ store: harness.store, baseDir: harness.baseDir, secretStore: createTestSecretStore() })
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  try {
    await run(`http://127.0.0.1:${server.address().port}/api`)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

async function request(base, path, { method = 'GET', body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = response.status === 204 ? null : await response.json()
  assert(response.ok, `expected ${method} ${path} to succeed`, { status: response.status, data })
  return data
}

async function testWorkdayAcrossModules() {
  const harness = await createServiceHarness('phase2-workday-e2e')
  try {
    clearTools()
    await withServer(harness, async (base) => {
      const categories = await request(base, '/ledger/categories?type=expense')
      const food = categories.items.find((item) => item.name === '餐饮')
      assert(food, 'expected seeded food category', categories)
      await request(base, '/ledger/entries/expense', {
        method: 'POST',
        body: {
          amount: 66,
          categoryId: food.id,
          categoryName: food.name,
          item: '午饭',
          occurredAt: `${DATE}T12:00:00.000+08:00`,
        },
      })
      const month = DATE.slice(0, 7)
      const ledger = await request(base, `/ledger/entries?from=${month}-01&to=${month}-31`)
      assert(ledger.items.some((item) => item.amount === 66 && item.item === '午饭'), 'expected saved expense', ledger)

      const todo = await request(base, '/todos', { method: 'POST', body: { title: '整理演示素材' } })
      const completed = await request(base, `/todos/${todo.entry.id}/complete`, { method: 'POST' })
      assert(completed.entry.status === 'done', 'expected completed todo', completed)
      const reopened = await request(base, `/todos/${todo.entry.id}/reopen`, { method: 'POST' })
      assert(reopened.entry.status === 'pending', 'expected reopened todo', reopened)

      const schedule = await request(base, '/schedules', {
        method: 'POST',
        body: { title: '产品演示', startAt: `${DATE}T15:00:00.000+08:00` },
      })
      const cancelled = await request(base, `/schedules/${schedule.entry.id}/cancel`, { method: 'POST' })
      assert(cancelled.entry.status === 'cancelled', 'expected cancelled schedule', cancelled)
      const restored = await request(base, `/schedules/${schedule.entry.id}/restore`, { method: 'POST' })
      assert(restored.entry.status === 'scheduled', 'expected restored schedule', restored)

      const observation = await request(base, '/observations', {
        method: 'POST',
        body: { date: DATE, type: 'note', title: '工作日观察', content: '六类业务均已真实落库。' },
      })
      const rereadObservation = await request(base, `/observations/${observation.observation.id}`)
      assert(rereadObservation.observation.content === '六类业务均已真实落库。', 'expected observation reload', rereadObservation)

      await request(base, `/entries/${DATE}`, { method: 'PUT', body: { userText: '今天完成了产品演示。' } })
      const diary = await request(base, `/entries/${DATE}`)
      assert(diary.entry.userText === '今天完成了产品演示。', 'expected diary reload', diary)

      await request(base, '/settings/model', {
        method: 'PUT',
        body: { apiKey: 'phase2-e2e-key', baseUrl: 'https://example.test', model: 'phase2-demo' },
      })
      const settings = await request(base, '/settings/model')
      assert(settings.settings.model === 'phase2-demo', 'expected settings reload', settings)
      assert(!JSON.stringify(settings).includes('phase2-e2e-key'), 'expected API key to remain masked', settings)
      await request(base, '/settings/model', { method: 'DELETE' })
      const cleared = await request(base, '/settings/model')
      assert(cleared.settings.hasApiKey === false, 'expected settings to clear API key', cleared)
    })
  } finally {
    await harness.close()
  }
}

await testWorkdayAcrossModules()
console.log('tests/services/phase2-workday-e2e.test.mjs: passed 1/1')
