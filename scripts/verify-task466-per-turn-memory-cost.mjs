import fs from 'node:fs'
import path from 'node:path'

import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { createObservationService } from '../electron/backend/observation/service.js'
import { runMemoryDistillation } from '../electron/backend/agent/memoryDistillation.js'

async function run() {
  const harness = await createServiceHarness('task466-per-turn-memory-cost')
  const memoryWiki = await createMemoryWikiService({
    baseDir: harness.baseDir,
    store: harness.store
  })

  try {
    // 造多个页面，并破坏其中一页的文件（模拟坏页/缺文件）
    const pages = []
    for (let i = 0; i < 5; i += 1) {
      pages.push(await memoryWiki.create({ pageType: 'event', title: `开销页${i}`, summary: `s${i}` }))
    }
    fs.rmSync(pages[2].filePath, { force: true }) // 坏页：index 存在但文件缺失

    // 提炼轮输入为轻索引：不逐页读文件 → 坏页不阻塞提炼轮
    const previousApiKey = process.env.DEEPSEEK_API_KEY
    process.env.DEEPSEEK_API_KEY = 'verify-466-key'
    const originalFetch = global.fetch
    global.fetch = async () => ({
      ok: true,
      status: 200,
      async json() {
        return { choices: [{ message: { content: JSON.stringify({ observations: [], identity_updates: [], memory_wiki_requests: [], reasoning: '' }) } }] }
      },
      async text() {
        return ''
      }
    })

    try {
      const result = await runMemoryDistillation({
        store: harness.store,
        baseDir: harness.baseDir,
        date: '2026-08-21',
        userMessage: '今天没什么特别的',
        cornieMessage: '嗯嗯',
        messageId: 'm-466',
        history: []
      })
      assert(result.decisionSource === 'llm', '提炼轮应正常完成（轻索引不受坏页影响）', result.decisionSource)

      // 无提议 → 零写入（每轮开销控制：不因 LLM 决策为空而额外写入）
      const observations = createObservationService(harness.store).listByDate('2026-08-21')
      assert(observations.length === 0, '无提炼提议时零观察写入', observations.length)
      const profilePages = await memoryWiki.listSummaries({ pageType: 'identity_profile' })
      assert(profilePages.length === 0, '无提炼提议时零身份页', profilePages.length)
    } finally {
      global.fetch = originalFetch
      if (previousApiKey === undefined) {
        delete process.env.DEEPSEEK_API_KEY
      } else {
        process.env.DEEPSEEK_API_KEY = previousApiKey
      }
    }

    console.log('verify-task466-per-turn-memory-cost: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
