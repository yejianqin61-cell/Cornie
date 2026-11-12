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

async function testAuditRoute() {
  const harness = await createServiceHarness('memory-wiki-routes-audit')
  try {
    await withServer(harness, async (base) => {
      const a = (await createPage(base, { pageType: 'event', title: '审计页A', summary: 's' })).page
      const b = (await createPage(base, { pageType: 'event', title: '审计页B', summary: 's' })).page
      const c = (await createPage(base, { pageType: 'event', title: '审计页C', summary: 's' })).page
      await putJson(`${base}/memory-wiki/pages/${a.pageId}`, { summary: '更新后' })

      const all = await json(`${base}/memory-wiki/audit`)
      const count = (type) => all.items.filter((item) => item.eventType === type).length
      assert(count('page_created') === 3 && count('page_updated') === 1, 'expected 3 creates and 1 update', all)
      assert(all.items[0].createdAt >= all.items.at(-1).createdAt, 'expected newest first', all)

      const onlyA = await json(`${base}/memory-wiki/audit?pageId=${a.pageId}`)
      assert(onlyA.items.length === 2, 'expected only the two events of page A', onlyA)
      assert(onlyA.items.every((item) => item.pageId === a.pageId || item.relatedPageId === a.pageId), 'expected A only', onlyA)

      await json(`${base}/memory-wiki/pages/merge`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ targetPageId: a.pageId, sourcePageId: b.pageId })
      })
      const bEvents = await json(`${base}/memory-wiki/audit?pageId=${b.pageId}`)
      assert(bEvents.items.some((item) => item.eventType === 'pages_merged'), 'expected the merge event via relatedPageId', bEvents)

      const junk = await fetch(`${base}/memory-wiki/audit?limit=abc`)
      assert(junk.status === 200, 'expected a non-numeric limit to be tolerated', junk.status)
      assert(c.pageId, 'page C exists')
    })
  } finally {
    await harness.close()
  }
}

async function testAuditLimit() {
  const harness = await createServiceHarness('memory-wiki-routes-audit-limit')
  try {
    await withServer(harness, async (base) => {
      for (let i = 0; i < 60; i += 1) {
        await createPage(base, { pageType: 'event', title: `限量页${i}`, summary: 's' })
      }
      const byDefault = await json(`${base}/memory-wiki/audit`)
      assert(byDefault.items.length === 50, 'expected the default limit of 50', byDefault.items.length)
      const five = await json(`${base}/memory-wiki/audit?limit=5`)
      assert(five.items.length === 5, 'expected limit=5', five.items.length)
      const junk = await json(`${base}/memory-wiki/audit?limit=abc`)
      assert(junk.items.length === 50, 'expected junk limit to fall back to 50', junk.items.length)
    })
  } finally {
    await harness.close()
  }
}

await testOwnerConfirmedRoute()
await testAuditRoute()
await testAuditLimit()
await testListReportsRealTotal()
console.log('tests/services/memory-wiki-routes.test.mjs: passed 4/4')
