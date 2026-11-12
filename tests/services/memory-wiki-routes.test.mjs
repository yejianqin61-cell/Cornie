import { clearTools } from '../../electron/backend/tools/registry.js'
import { createMemoryWikiAuditStore } from '../../electron/backend/memory-wiki/index.js'
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

function createPage(base, body) {
  return json(`${base}/memory-wiki/pages`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) })
}

function putJson(url, body) {
  return fetch(url, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(body) })
}

async function testOwnerConfirmedRoute() {
  const harness = await createServiceHarness('memory-wiki-routes-owner-confirmed')
  try {
    await withServer(harness, async (base) => {
      const { page } = await createPage(base, { pageType: 'event', title: '确认页', summary: '摘要' })
      const url = `${base}/memory-wiki/pages/${page.pageId}/owner-confirmed`

      const confirmed = await (await putJson(url, { ownerConfirmed: true })).json()
      assert(confirmed.page.ownerConfirmed === true, 'expected confirmed in response', confirmed)
      assert((await json(`${base}/memory-wiki/pages/${page.pageId}`)).page.ownerConfirmed === true, 'expected confirmed on read')

      const versions = await json(`${base}/memory-wiki/pages/${page.pageId}/versions`)
      assert(versions.items.length === 1, 'expected one version snapshot for the toggle', versions)
      const audit = await (await createMemoryWikiAuditStore(harness.baseDir)).list({ limit: 20 })
      assert(audit.some((item) => item.eventType === 'page_updated' && item.pageId === page.pageId), 'expected page_updated audit', audit)

      const unconfirmed = await (await putJson(url, { ownerConfirmed: false })).json()
      assert(unconfirmed.page.ownerConfirmed === false, 'expected unconfirmed again', unconfirmed)

      const bad = await putJson(url, { ownerConfirmed: 'yes' })
      assert(bad.status === 400, 'expected 400 for a non-boolean value', bad.status)
    })
  } finally {
    await harness.close()
  }
}

async function testListReportsRealTotal() {
  const harness = await createServiceHarness('memory-wiki-routes-total')
  try {
    await withServer(harness, async (base) => {
      const pages = []
      for (let i = 0; i < 30; i += 1) {
        const { page } = await createPage(base, { pageType: 'event', title: `总数页${String(i).padStart(2, '0')}`, summary: 's' })
        pages.push(page)
      }
      for (const page of pages.slice(0, 4)) {
        await json(`${base}/memory-wiki/pages/${page.pageId}/archive`, { method: 'POST' })
      }

      const paged = await json(`${base}/memory-wiki/pages?limit=10&offset=10`)
      assert(paged.items.length === 10 && paged.total === 30, 'expected a page of 10 with total 30', paged)
      const archived = await json(`${base}/memory-wiki/pages?status=archived&limit=2`)
      assert(archived.items.length === 2 && archived.total === 4, 'expected 2 items with total 4', archived)
      const all = await json(`${base}/memory-wiki/pages`)
      assert(all.total === all.items.length, 'expected total to equal item count without paging', all)
    })
  } finally {
    await harness.close()
  }
}

await testOwnerConfirmedRoute()
await testListReportsRealTotal()
console.log('tests/services/memory-wiki-routes.test.mjs: passed 2/2')
