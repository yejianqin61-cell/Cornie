import fs from 'node:fs'
import path from 'node:path'

import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { createConversationOrchestrator } from '../electron/backend/agent/orchestrator.js'
import { registerTool } from '../electron/backend/tools/registry.js'
import { executeToolCalls } from '../electron/backend/tools/gateway.js'
import { registerMemoryWikiTools } from '../electron/backend/memory-wiki/tools.js'
import { createRuntimeTempDir, cleanupSqliteFile } from './tmp-artifacts.mjs'

async function run() {
  const harness = await createServiceHarness('task452-drill-budget-and-page-cache')
  const memoryWiki = await createMemoryWikiService({
    baseDir: harness.baseDir,
    store: harness.store
  })

  try {
    // 1) 跨轮缓存：读后改盘，get 命中缓存；写侧失效后读新
    const page = await memoryWiki.create({ pageType: 'event', title: '缓存页', summary: 'v1', body: '正文一' })
    await memoryWiki.get(page.pageId) // 填充缓存

    // 直接改盘（绕过 service 写路径），观察 get 是否命中缓存
    const pagePath = page.filePath
    const raw = fs.readFileSync(pagePath, 'utf8').replace('正文一', '正文被外部改了')
    fs.writeFileSync(pagePath, raw, 'utf8')

    const cachedRead = await memoryWiki.get(page.pageId)
    assert(cachedRead.body === '正文一', '读侧应命中缓存（外部改动不可见）', cachedRead.body)

    // 写侧失效：update 后 get 返回新内容
    await memoryWiki.update({ pageId: page.pageId, summary: 'v2' })
    const afterUpdate = await memoryWiki.get(page.pageId)
    assert(afterUpdate.summary === 'v2', 'update 后缓存应失效，读到新内容', afterUpdate.summary)

    // 2) 单页正文截断（get_page 工具）
    const bigPage = await memoryWiki.create({
      pageType: 'event',
      title: '长文页',
      summary: 's',
      body: 'x'.repeat(5000)
    })
    await registerMemoryWikiTools({ baseDir: harness.baseDir, store: harness.store }, { registerTool })
    const toolResult = await executeToolCalls(
      [{ tool_name: 'memory_wiki.get_page', arguments: { pageId: bigPage.pageId } }],
      { date: '2026-08-21', store: harness.store, source: 'conversation' }
    )
    const readBody = toolResult.results[0]?.result?.body ?? ''
    assert(readBody.length <= 2001, 'get_page 正文应被截断', readBody.length)

    // 3) 钻取预算：mock LLM 持续请求记忆钻取，最多 4 次后停止
    const drillEnv = await createServiceHarness('task452-drill-budget')
    try {
      const drillPage = await createMemoryWikiService({ baseDir: drillEnv.baseDir, store: drillEnv.store })
      const drillTarget = await drillPage.create({ pageType: 'event', title: '钻取页', summary: 's' })

      const previousApiKey = process.env.DEEPSEEK_API_KEY
      process.env.DEEPSEEK_API_KEY = 'verify-452-key'
      const originalFetch = global.fetch
      let drillCalls = 0
      global.fetch = async (_url, options = {}) => {
        const payload = JSON.parse(String(options?.body ?? '{}'))
        const prompt = String(payload?.messages?.[0]?.content ?? '')
        if (prompt.includes('memory distillation')) {
          return {
            ok: true, status: 200,
            async json() {
              return { choices: [{ message: { content: JSON.stringify({ observations: [], identity_updates: [], memory_wiki_requests: [], reasoning: '' }) } }] }
            },
            async text() { return '' }
          }
        }
        drillCalls += 1
        return {
          ok: true, status: 200,
          async json() {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    type: 'tool_call',
                    assistant_reply: '让我翻翻记忆…',
                    tool_calls: [{ tool_name: 'memory_wiki.get_page', arguments: { pageId: drillTarget.pageId } }]
                  })
                }
              }]
            }
          },
          async text() { return '' }
        }
      }

      try {
        const orchestrator = createConversationOrchestrator(drillEnv.store, { baseDir: drillEnv.baseDir })
        const result = await orchestrator.runTurn({ date: '2026-08-21', message: '翻一下记忆' })
        assert(
          (result.toolExecution?.results ?? []).length <= 4,
          '记忆钻取轮次应受 MAX_DRILL_ROUNDS=4 约束',
          result.toolExecution?.results?.length
        )
        assert(
          String(result.cornieMessage?.content ?? '').includes('翻到这儿'),
          '预算耗尽后应停止并给出口径',
          result.cornieMessage?.content
        )
      } finally {
        global.fetch = originalFetch
        if (previousApiKey === undefined) {
          delete process.env.DEEPSEEK_API_KEY
        } else {
          process.env.DEEPSEEK_API_KEY = previousApiKey
        }
      }
    } finally {
      await drillEnv.close()
    }

    console.log('verify-task452-drill-budget-and-page-cache: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
