import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { upsertIdentityTraitFromConversation } from '../electron/backend/identity/traitUpsert.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { buildWikiContext } from '../electron/backend/agent/wikiContext.js'

async function run() {
  const harness = await createServiceHarness('task354-identity-trait-governance')
  const baseDir = harness.baseDir
  const memoryWiki = await createMemoryWikiService({ baseDir, store: harness.store })

  const created = await upsertIdentityTraitFromConversation(harness.store, {
    baseDir,
    date: '2026-06-30',
    messageId: 'trait-1',
    userMessage: '我最近真的好累，压力很大，但还是会继续把项目往前推。',
    candidate: {
      title: '高压下容易疲惫',
      traitType: '压力反应',
      traitSummary: '用户在高压阶段容易感到疲惫，但仍倾向继续扛着事情往前走。',
      triggerKeywords: ['累', '好累', '疲惫', '压力']
    }
  })

  assert(created.action === 'created', '高价值长期侧写表达应创建 trait 页面')

  const pages = await memoryWiki.list({
    pageType: 'identity_trait',
    status: 'review'
  })
  assert(pages.length === 1, '低证据 trait 应默认进入 review 状态')

  const page = await memoryWiki.get(pages[0].pageId)
  assert(page.evidenceCount === 1, '首次 trait 写入 evidenceCount 应为 1')
  assert(page.confidenceLevel === 'low', '首次 trait 写入置信度应为 low')
  assert(page.stabilityLevel === 'low', '首次 trait 写入稳定性应为 low')

  const governanceItems = await memoryWiki.listGovernanceRequests({
    requestType: 'identity_trait_review',
    queueSection: 'identity_trait_reviews'
  })
  assert(governanceItems.length >= 1, '低证据 trait 应进入治理候选池')

  const updated = await upsertIdentityTraitFromConversation(harness.store, {
    baseDir,
    date: '2026-07-01',
    messageId: 'trait-2',
    userMessage: '我最近还是好累，压力真的很大。',
    candidate: {
      title: '高压下容易疲惫',
      traitType: '压力反应',
      traitSummary: '用户在高压阶段容易感到疲惫，但仍倾向继续扛着事情往前走。',
      triggerKeywords: ['累', '好累', '疲惫', '压力']
    }
  })
  assert(updated.action === 'updated', '重复侧写证据应累加到同一 trait 页面')

  const refreshedPage = await memoryWiki.get(pages[0].pageId)
  assert(refreshedPage.evidenceCount === 2, '重复 trait 证据应累加')
  assert(refreshedPage.confidenceLevel === 'medium', '重复证据后置信度应提升到 medium')

  // 451：trait 页以目录条目形式出现（摘要+重要性+时间），不再由情绪词表门控注入。
  const unrelatedContext = await buildWikiContext(harness.store, {
    date: '2026-07-01',
    baseDir,
    query: ''
  })
  assert(unrelatedContext.memorySummary.includes('[identity_trait/medium] 高压下容易疲惫'), 'trait 页应以目录条目形式出现')

  const emotionalContext = await buildWikiContext(harness.store, {
    date: '2026-07-01',
    baseDir,
    query: '最近好累 压力很大'
  })
  assert(emotionalContext.memorySummary.includes('高压下容易疲惫'), 'trait 目录条目应在（query 只影响排序）')

  await harness.close()
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
