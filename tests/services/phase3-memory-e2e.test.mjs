import { saveMessage } from '../../electron/db.js'
import { runMemoryDistillation } from '../../electron/backend/agent/memoryDistillation.js'
import { buildWikiContext } from '../../electron/backend/agent/wikiContext.js'
import { whenMemoryDistillationIdle } from '../../electron/backend/agent/orchestrator.js'
import { clearTools } from '../../electron/backend/tools/registry.js'
import { createServer } from '../../electron/server.js'
import { assert, createServiceHarness } from '../shared/service-harness.mjs'

const DATE = '2026-10-22'
const USER_MESSAGE_ID = 'phase3-memory-user'

async function withServer(harness, run, conversationOptions = {}) {
  clearTools()
  const app = await createServer({ store: harness.store, baseDir: harness.baseDir, conversationOptions })
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

// 本地 API 请求透传给真实 fetch；其余（DeepSeek）请求由 handler 处理，提炼请求可被闸门挡住。
function installGatedModelFetch(distillationContent) {
  const originalFetch = global.fetch
  let release = () => {}
  const gate = new Promise((resolve) => {
    release = resolve
  })
  global.fetch = async (url, options = {}) => {
    if (String(url).startsWith('http://127.0.0.1')) return originalFetch(url, options)
    const payload = JSON.parse(String(options.body ?? '{}'))
    const isDistillation = String(payload?.messages?.[0]?.content ?? '').includes('记忆提炼官')
    const content = isDistillation
      ? (await gate, distillationContent)
      : JSON.stringify({ type: 'reply', assistant_reply: '好的主人。' })
    return {
      ok: true,
      status: 200,
      async json() {
        return { choices: [{ message: { content } }] }
      },
      async text() {
        return content
      }
    }
  }
  return {
    release: () => release(),
    restore: () => {
      global.fetch = originalFetch
    }
  }
}

async function testReplyTimingAndConcurrentMemoryWrites() {
  const harness = await createServiceHarness('phase3-reply-timing')
  const previousKey = process.env.DEEPSEEK_API_KEY
  process.env.DEEPSEEK_API_KEY = 'e2e-key'
  const gated = installGatedModelFetch(
    JSON.stringify({
      observations: [],
      identity_updates: [],
      memory_wiki_requests: [{ action: 'create_page', pageType: 'event', title: '提炼新页', summary: '来自提炼' }],
      reasoning: ''
    })
  )
  try {
    await withServer(
      harness,
      async (base) => {
        // Case 1：提炼被挡住时，流式回复照样完成，随后读历史能看到本轮两条消息
        const stream = await fetch(`${base}/conversations/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: DATE, message: '今天聊了点事' })
        })
        const streamText = await stream.text()
        assert(streamText.includes('"kind":"done"'), 'expected done before distillation finished', streamText)
        const history = await json(`${base}/chatlogs/${DATE}`)
        assert(
          history.messages.some((item) => item.role === 'user') &&
            history.messages.some((item) => item.role === 'cornie'),
          'expected both messages visible after done',
          history
        )

        // Case 2、3：提炼被挡住期间并发创建 5 页，放开后提炼再建 1 页，共 6 页且标题互不相同
        await Promise.all(
          Array.from({ length: 5 }, (_item, i) =>
            json(`${base}/memory-wiki/pages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pageType: 'event', title: `界面页${i}`, summary: 's' })
            })
          )
        )
        gated.release()
        await whenMemoryDistillationIdle()
        const pages = await json(`${base}/memory-wiki/pages`)
        assert(pages.items.length === 6, 'expected 5 http pages plus 1 distilled page', pages.items.length)
        assert(new Set(pages.items.map((item) => item.title)).size === 6, 'expected six distinct titles', pages.items)
        assert(pages.items.some((item) => item.title === '提炼新页'), 'expected the distilled page', pages.items)
      },
      {
        chatFn: async () => ({ content: JSON.stringify({ type: 'reply', assistant_reply: '好的主人。' }) }),
        chatStreamFn: async (_request, onDelta) => {
          onDelta('好的')
          return { content: '好的主人。' }
        }
      }
    )
  } finally {
    gated.release()
    gated.restore()
    if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY
    else process.env.DEEPSEEK_API_KEY = previousKey
    await harness.close()
  }
}

await testMemoryLifecycleThroughRealHttp()
await testReplyTimingAndConcurrentMemoryWrites()
await testDistillationLoopEndToEnd()
await testConfirmedPageUpdateGoesThroughGovernance()
console.log('tests/services/phase3-memory-e2e.test.mjs: passed 4/4')
