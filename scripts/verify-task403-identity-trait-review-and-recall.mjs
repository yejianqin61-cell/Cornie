import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { upsertIdentityTraitFromConversation } from '../electron/backend/identity/traitUpsert.js'
import { buildWikiContext } from '../electron/backend/agent/wikiContext.js'

async function run() {
  const harness = await createServiceHarness('task403-identity-trait-review-and-recall')
  const baseDir = harness.baseDir
  const store = harness.store

  try {
    const memoryWiki = await createMemoryWikiService({ baseDir, store })
    const topicIndex = await createTopicIndexStore(baseDir)

    await upsertIdentityProfileFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'profile-1',
      userMessage: '我叫叶健钦，我是你的爸爸，也是你的创造者。',
      candidate: {
        userName: '叶健钦',
        cornieRelationship: '用户是 Cornie 的爸爸和创造者'
      }
    })

    const skipped = await upsertIdentityTraitFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'trait-skip-1',
      userMessage: '今天中午吃了饭，然后去上课。'
    })
    assert(skipped.action === 'skipped', '普通流水表达不应误建 trait 页')

    const created = await upsertIdentityTraitFromConversation(store, {
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
    assert(created.action === 'created', '高价值长期侧写表达应创建 trait 页')

    const pages = await memoryWiki.list({
      pageType: 'identity_trait',
      status: 'review'
    })
    assert(pages.length === 1, '低证据 trait 应默认进入 review')

    const page = await memoryWiki.get(pages[0].pageId)
    assert(page.traitType === '压力反应', 'trait 页应记录 traitType')
    assert(page.traitSummary.length > 0, 'trait 页应记录 traitSummary')
    assert(page.evidenceCount === 1, '首次写入 evidenceCount 应为 1')
    assert(page.confidenceLevel === 'low', '首次写入 confidenceLevel 应为 low')
    assert(page.stabilityLevel === 'low', '首次写入 stabilityLevel 应为 low')
    assert(page.status === 'review', '首次写入应进入 review')
    assert(page.triggerKeywords.includes('压力'), 'trait 页应记录 triggerKeywords')
    assert(page.sourceRefs.some((item) => item.kind === 'chat' && item.messageId === 'trait-1'), 'trait 页应记录来源')

    const governanceItems = await memoryWiki.listGovernanceRequests({
      requestType: 'identity_trait_review',
      queueSection: 'identity_trait_reviews'
    })
    assert(governanceItems.length >= 1, 'trait 页应进入治理候选池')

    const profileSummaries = await memoryWiki.listSummaries({
      pageType: 'identity_profile',
      status: 'active'
    })
    const profilePage = await memoryWiki.get(profileSummaries[0].pageId)
    assert((profilePage.relatedPageIds || []).includes(page.pageId), '主身份页应自动关联 trait 页')
    assert((page.relatedPageIds || []).includes(profilePage.pageId), 'trait 页应反链主身份页')

    const topic = await topicIndex.get(page.title)
    assert(Boolean(topic), 'trait 页应自动联动 Topic')
    assert(topic.memoryPageIds.includes(page.pageId), 'Topic 应关联 trait 页')
    assert(topic.chatRefs.includes('2026-06-30#trait-1'), 'Topic 应记录聊天来源')

    const updated = await upsertIdentityTraitFromConversation(store, {
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
    assert(updated.action === 'updated', '重复 trait 证据应累加到同一页')

    const refreshed = await memoryWiki.get(page.pageId)
    assert(refreshed.evidenceCount === 2, '重复证据后 evidenceCount 应累加')
    assert(refreshed.confidenceLevel === 'medium', '重复证据后 confidenceLevel 应提升到 medium')
    assert(refreshed.stabilityLevel === 'medium', '重复证据后 stabilityLevel 应提升到 medium')

    const repeatedSameSource = await upsertIdentityTraitFromConversation(store, {
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
    assert(repeatedSameSource.action === 'noop', '同源重复写入应保持幂等')

    const neutralContext = await buildWikiContext(store, {
      date: '2026-07-01',
      baseDir,
      query: '',
      pageLimit: 6,
      topicLimit: 4
    })
    assert(!neutralContext.memorySummary.includes('[trait/'), '无关 query 时 trait 不应默认注入')

    const emotionalContext = await buildWikiContext(store, {
      date: '2026-07-01',
      baseDir,
      query: '我最近压力真的很大，好累',
      pageLimit: 6,
      topicLimit: 4
    })
    assert(emotionalContext.memorySummary.includes('[trait/压力反应/medium/medium]'), '情绪压力 query 下应召回 trait 页')

    const unrelatedContext = await buildWikiContext(store, {
      date: '2026-07-01',
      baseDir,
      query: '我想聊聊奶茶和项目安排',
      pageLimit: 6,
      topicLimit: 4
    })
    assert(!unrelatedContext.memorySummary.includes('高压下容易疲惫'), '无关 query 时不应误带 trait')

    console.log('verify-task403-identity-trait-review-and-recall: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
