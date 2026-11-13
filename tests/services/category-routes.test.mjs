import { clearTools } from '../../electron/backend/tools/registry.js'
import { createServer } from '../../electron/server.js'
import { assert, createServiceHarness } from '../shared/service-harness.mjs'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function withServer(harness, run) {
  clearTools()
  const app = await createServer({ store: harness.store, baseDir: harness.baseDir })
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  try {
    await run(`http://127.0.0.1:${server.address().port}/api`)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

async function json(url, options) {
  const response = await fetch(url, options)
  const body = await response.json()
  assert(response.ok, `expected HTTP success for ${url}`, body)
  return body
}

async function testIncludeInactive(route, label) {
  const harness = await createServiceHarness(`category-routes-${label}`)
  try {
    await withServer(harness, async (base) => {
      const before = (await json(`${base}/${route}`)).items.length
      const first = await json(`${base}/${route}`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name: '读书' })
      })
      await json(`${base}/${route}`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name: '运动' })
      })
      await json(`${base}/${route}/${first.category.id}`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ isActive: false })
      })

      const activeOnly = await json(`${base}/${route}`)
      const everything = await json(`${base}/${route}?includeInactive=true`)
      assert(activeOnly.items.length === before + 1, `expected ${label} default list to hide the stopped category`, activeOnly)
      assert(everything.items.length === before + 2, `expected ${label} includeInactive list to show both`, everything)
      assert(
        everything.items.some((item) => item.id === first.category.id && item.isActive === false),
        `expected the stopped ${label} category to be marked inactive`,
        everything
      )
    })
  } finally {
    await harness.close()
  }
}

await testIncludeInactive('todo-categories', 'todo')
await testIncludeInactive('schedule-categories', 'schedule')
console.log('tests/services/category-routes.test.mjs: passed 2/2')
