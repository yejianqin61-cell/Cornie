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
      assert(applied.result.request.status === 'approved', 'expected applied proposal to be approved', applied)

      const archived = await json(`${base}/memory-wiki/pages/${existing.page.pageId}`)
      assert(archived.page.status === 'archived', 'expected approved archive proposal to archive the page', archived)
    })
  } finally {
    await harness.close()
  }
}

await testMemoryLifecycleThroughRealHttp()
console.log('tests/services/phase3-memory-e2e.test.mjs: passed 1/1')
