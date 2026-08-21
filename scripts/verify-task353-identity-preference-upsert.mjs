import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { upsertIdentityPreferenceFromConversation } from '../electron/backend/identity/preferenceUpsert.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { buildWikiContext } from '../electron/backend/agent/wikiContext.js'

async function run() {
  const harness = await createServiceHarness('task353-identity-preference-upsert')
  const baseDir = harness.baseDir
  const memoryWiki = await createMemoryWikiService({ baseDir, store: harness.store })

  const first = await upsertIdentityPreferenceFromConversation(harness.store, {
    baseDir,
    date: '2026-06-30',
    messageId: 'pref-1',
    userMessage: '我不喜欢太甜的咖啡。',
    candidate: {
      title: '咖啡',
      stance: '不喜欢',
      preferenceType: '饮食',
      triggerKeywords: ['咖啡']
    }
  })

  assert(first.action === 'created', '首次偏好表达应创建 identity_preference 页面')

  const pages = await memoryWiki.list({
    pageType: 'identity_preference',
    status: 'active'
  })
  assert(pages.length === 1, '应只创建一条匹配的偏好页')

  const page = await memoryWiki.get(pages[0].pageId)
  assert(page.stance === '不喜欢', '偏好页应记录立场')
  assert(page.evidenceCount === 1, '首次写入 evidenceCount 应为 1')
  assert(page.stabilityLevel === 'low', '首次写入稳定性应为 low')

  const second = await upsertIdentityPreferenceFromConversation(harness.store, {
    baseDir,
    date: '2026-07-01',
    messageId: 'pref-2',
    userMessage: '我还是不喜欢太甜的咖啡。',
    candidate: {
      title: '咖啡',
      stance: '不喜欢',
      preferenceType: '饮食',
      triggerKeywords: ['咖啡']
    }
  })

  assert(second.action === 'updated', '重复偏好表达应累计证据而不是新建页面')

  const updated = await memoryWiki.get(pages[0].pageId)
  assert(updated.evidenceCount === 2, '重复表达后 evidenceCount 应累加')
  assert(updated.stabilityLevel === 'medium', '重复表达后稳定性应提升到 medium')

  const emptyQueryContext = await buildWikiContext(harness.store, {
    date: '2026-07-01',
    baseDir,
    query: ''
  })
  assert(!emptyQueryContext.memorySummary.includes('咖啡'), '无关 query 时不应默认注入偏好页摘要')

  const matchedContext = await buildWikiContext(harness.store, {
    date: '2026-07-01',
    baseDir,
    query: '咖啡 太甜'
  })
  assert(matchedContext.memorySummary.includes('咖啡'), '相关 query 时应命中偏好页摘要')

  await harness.close()
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
