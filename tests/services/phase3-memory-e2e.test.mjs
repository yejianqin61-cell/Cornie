import { saveMessage } from '../../electron/db.js'
import { runMemoryDistillation } from '../../electron/backend/agent/memoryDistillation.js'
import { buildWikiContext } from '../../electron/backend/agent/wikiContext.js'
import { clearTools } from '../../electron/backend/tools/registry.js'
import { createServer } from '../../electron/server.js'
import { assert, createServiceHarness } from '../shared/service-harness.mjs'

const DATE = '2026-10-22'
const USER_MESSAGE_ID = 'phase3-memory-user'

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

function createDistillationStub(archivePageId) {
  return async () => ({
    content: JSON.stringify({
      observations: [],
      identity_updates: [],
      memory_wiki_requests: [
        {
          action: 'create_page',
          pageType: 'identity_preference',
          title: '咖啡偏好',
          summary: '主人喜欢拿铁。',
          body: '主人在 2026-10-22 表示喜欢拿铁。',
          importance: 'high'
        },
        {
          action: 'archive_page',
          pageId: archivePageId,
          title: '过期咖啡偏好'
        }
      ],
      reasoning: '写入稳定偏好，并把高风险归档交给主人。'
    })
  })
}

async function json(url, options) {
  const response = await fetch(url, options)
  const body = await response.json()
  assert(response.ok, `expected HTTP success for ${url}`, body)
  return body
}

async function testMemoryLifecycleThroughRealHttp() {
  const harness = await createServiceHarness('phase3-memory-e2e')
  try {
    saveMessage(harness.store, {
      id: USER_MESSAGE_ID,
      date: DATE,
      role: 'user',
      content: '请记住，我长期喜欢喝拿铁。'
    })

    await withServer(harness, async (base) => {
      const existing = await json(`${base}/memory-wiki/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType: 'identity_preference',
          title: '过期咖啡偏好',
          summary: '旧偏好',
          body: '旧偏好。'
        })
      })

      const distillation = await runMemoryDistillation({
        store: harness.store,
        baseDir: harness.baseDir,
        date: DATE,
        userMessage: '请记住，我长期喜欢喝拿铁。',
        cornieMessage: '我记住你喜欢拿铁了。',
        messageId: USER_MESSAGE_ID,
        history: [{ role: 'user', content: '请记住，我长期喜欢喝拿铁。' }],
        chatFn: createDistillationStub(existing.page.pageId)
      })
      const createdId = distillation.results?.wikiRequests.find((item) => item.action === 'created')?.pageId
      assert(createdId, 'expected distillation to create a memory page', distillation)

      const created = await json(`${base}/memory-wiki/pages/${createdId}`)
      assert(created.page.summary === '主人喜欢拿铁。', 'expected extracted preference page', created)

      const trace = await json(`${base}/memory-wiki/pages/${createdId}/source-trace`)
      assert(
        trace.trace.chatSources.some((item) => item.messageId === USER_MESSAGE_ID && item.exists),
        'expected memory page trace to resolve its user message',
        trace
      )

      const recalled = await buildWikiContext(harness.store, {
        date: DATE,
        baseDir: harness.baseDir,
        query: '拿铁'
      })
      assert(recalled.memorySummary.includes('主人喜欢拿铁。'), 'expected preference summary in recalled context', recalled)

      const governance = await json(`${base}/memory-wiki/governance?triggerSource=memory_distillation`)
      const proposal = governance.items.find((item) => item.pageIds.includes(existing.page.pageId))
      assert(proposal?.status === 'pending', 'expected archive proposal in governance queue', governance)
      assert(proposal.evidence[0]?.action === 'archive_page', 'expected archive evidence retained', proposal)

      const approved = await json(`${base}/memory-wiki/governance/${proposal.requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      })
      assert(approved.item.status === 'approved', 'expected human approval before applying proposal', approved)

      const applied = await json(`${base}/memory-wiki/governance/${proposal.requestId}/apply`, { method: 'POST' })
      assert(applied.result.request.status === 'applied', 'expected applied proposal to reach terminal applied state', applied)

      const reapplied = await fetch(`${base}/memory-wiki/governance/${proposal.requestId}/apply`, { method: 'POST' })
      assert(reapplied.status >= 400, 'expected repeated apply to be rejected', reapplied.status)

      const archived = await json(`${base}/memory-wiki/pages/${existing.page.pageId}`)
      assert(archived.page.status === 'archived', 'expected approved archive proposal to archive the page', archived)
    })
  } finally {
    await harness.close()
  }
}

async function testConfirmedPageUpdateGoesThroughGovernance() {
  const harness = await createServiceHarness('phase3-confirmed-update')
  try {
    await withServer(harness, async (base) => {
      const post = (path, body) =>
        json(`${base}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      const distill = (pageId) =>
        runMemoryDistillation({
          store: harness.store,
          baseDir: harness.baseDir,
          date: DATE,
          userMessage: '更新一下',
          cornieMessage: '好的',
          messageId: 'confirmed-update-message',
          chatFn: async () => ({
            content: JSON.stringify({
              observations: [],
              identity_updates: [],
              memory_wiki_requests: [{ action: 'update_page', pageId, summary: '新摘要' }],
              reasoning: ''
            })
          })
        })

      const confirmed = await post('/memory-wiki/pages', {
        pageType: 'event',
        title: '已确认页',
        summary: '旧摘要',
        ownerConfirmed: true
      })
      const first = await distill(confirmed.page.pageId)
      assert(first.results.wikiRequests[0].action === 'deferred_to_governance', 'expected confirmed update deferred', first)
      const unchanged = await json(`${base}/memory-wiki/pages/${confirmed.page.pageId}`)
      assert(unchanged.page.summary === '旧摘要', 'expected confirmed page unchanged', unchanged)

      const queue = await json(`${base}/memory-wiki/governance?queueSection=memory_wiki_llm_proposals`)
      assert(queue.items.length === 1, 'expected exactly one queued proposal', queue)
      assert(queue.items[0].payload.request.summary === '新摘要', 'expected proposed summary retained', queue)
      assert(queue.items[0].status === 'pending', 'expected pending status', queue)

      const requestId = queue.items[0].requestId
      await json(`${base}/memory-wiki/governance/${requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      })
      const applied = await post(`/memory-wiki/governance/${requestId}/apply`)
      assert(applied.result.request.status === 'applied', 'expected applied terminal state', applied)
      const updated = await json(`${base}/memory-wiki/pages/${confirmed.page.pageId}`)
      assert(updated.page.summary === '新摘要', 'expected summary updated after apply', updated)
      const again = await fetch(`${base}/memory-wiki/governance/${requestId}/apply`, { method: 'POST' })
      assert(again.status >= 400, 'expected repeated apply rejected', again.status)

      const plain = await post('/memory-wiki/pages', { pageType: 'event', title: '未确认页', summary: '旧摘要' })
      const second = await distill(plain.page.pageId)
      assert(second.results.wikiRequests[0].action === 'updated', 'expected unconfirmed page updated directly', second)
      const direct = await json(`${base}/memory-wiki/pages/${plain.page.pageId}`)
      assert(direct.page.summary === '新摘要', 'expected direct update', direct)
      const after = await json(`${base}/memory-wiki/governance?queueSection=memory_wiki_llm_proposals`)
      assert(after.items.length === 1, 'expected queue unchanged for unconfirmed page', after)
    })
  } finally {
    await harness.close()
  }
}

async function testDistillationLoopEndToEnd() {
  const harness = await createServiceHarness('phase3-distillation-loop')
  try {
    await withServer(harness, async (base) => {
      const headers = { 'Content-Type': 'application/json' }
      const create = (body) =>
        json(`${base}/memory-wiki/pages`, { method: 'POST', headers, body: JSON.stringify(body) })
      const countPages = async () => (await json(`${base}/memory-wiki/pages`)).items.length
      const distill = (userMessage, requests) =>
        runMemoryDistillation({
          store: harness.store,
          baseDir: harness.baseDir,
          date: DATE,
          userMessage,
          cornieMessage: '好的',
          messageId: 'loop-message',
          chatFn: async () => ({
            content: JSON.stringify({
              observations: [],
              identity_updates: [],
              memory_wiki_requests: requests,
              reasoning: ''
            })
          })
        })

      // Case 1：聊到已有主题时更新那一页，不新建重复页
      const coffee = await create({ pageType: 'event', title: '咖啡偏好', summary: '旧摘要' })
      const before = await countPages()
      const updated = await distill('最近又开始喝咖啡了', [
        { action: 'update_page', pageId: coffee.page.pageId, summary: '新摘要' }
      ])
      assert(updated.results.wikiRequests[0].action === 'updated', 'expected update of the existing page', updated)
      assert((await countPages()) === before, 'expected no duplicate page')
      const afterUpdate = await json(`${base}/memory-wiki/pages/${coffee.page.pageId}`)
      assert(afterUpdate.page.summary === '新摘要', 'expected updated summary', afterUpdate)

      // Case 2：已确认页内容不变并入队；编造 ID 的归档提议不入队
      const confirmed = await create({ pageType: 'event', title: '茶偏好', summary: '旧摘要', ownerConfirmed: true })
      const guarded = await distill('聊聊茶', [
        { action: 'update_page', pageId: confirmed.page.pageId, summary: '新摘要' },
        { action: 'archive_page', pageId: 'ghost-page' }
      ])
      assert(guarded.results.wikiRequests[0].action === 'deferred_to_governance', 'expected confirmed update queued', guarded)
      assert(guarded.results.wikiRequests[1].action === 'skipped', 'expected ghost archive skipped', guarded)
      const stillOld = await json(`${base}/memory-wiki/pages/${confirmed.page.pageId}`)
      assert(stillOld.page.summary === '旧摘要', 'expected confirmed page unchanged', stillOld)
      const queue = await json(`${base}/memory-wiki/governance?queueSection=memory_wiki_llm_proposals`)
      assert(queue.items.length === 1, 'expected exactly one pending proposal', queue)

      // Case 3：批准并应用后页面更新、请求为 applied，再次应用被拒绝
      const requestId = queue.items[0].requestId
      await json(`${base}/memory-wiki/governance/${requestId}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: 'approved' })
      })
      const applied = await json(`${base}/memory-wiki/governance/${requestId}/apply`, { method: 'POST' })
      assert(applied.result.request.status === 'applied', 'expected applied state', applied)
      const afterApply = await json(`${base}/memory-wiki/pages/${confirmed.page.pageId}`)
      assert(afterApply.page.summary === '新摘要', 'expected confirmed page updated after apply', afterApply)
      const again = await fetch(`${base}/memory-wiki/governance/${requestId}/apply`, { method: 'POST' })
      assert(again.status >= 400, 'expected repeated apply rejected', again.status)
    })
  } finally {
    await harness.close()
  }
}

await testMemoryLifecycleThroughRealHttp()
await testDistillationLoopEndToEnd()
await testConfirmedPageUpdateGoesThroughGovernance()
console.log('tests/services/phase3-memory-e2e.test.mjs: passed 3/3')
