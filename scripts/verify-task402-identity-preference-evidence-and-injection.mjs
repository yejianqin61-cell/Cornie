import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { upsertIdentityPreferenceFromConversation } from '../electron/backend/identity/preferenceUpsert.js'
import { buildWikiContext } from '../electron/backend/agent/wikiContext.js'

async function run() {
  const harness = await createServiceHarness('task402-identity-preference-evidence-and-injection')
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

    const created = await upsertIdentityPreferenceFromConversation(store, {
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
    assert(created.action === 'created', '首次偏好表达应创建 preference 页')

    const page = await memoryWiki.get(created.pageId)
    assert(page.stance === '不喜欢', '偏好页应记录 stance')
    assert(page.preferenceType === '饮食', '偏好页应分类 preferenceType')
    assert(page.evidenceCount === 1, '首次写入 evidenceCount 应为 1')
    assert(page.stabilityLevel === 'low', '首次写入稳定性应为 low')
    assert(page.triggerKeywords.includes('咖啡'), '偏好页应记录 triggerKeywords')
    assert(page.sourceRefs.some((item) => item.kind === 'chat' && item.messageId === 'pref-1'), '偏好页应记录聊天来源')

    const profileSummaries = await memoryWiki.listSummaries({
      pageType: 'identity_profile',
      status: 'active'
    })
    const profilePage = await memoryWiki.get(profileSummaries[0].pageId)
    assert((profilePage.relatedPageIds || []).includes(created.pageId), '主身份页应自动关联 preference 页')
    assert((page.relatedPageIds || []).includes(profilePage.pageId), 'preference 页应反链主身份页')

    const topic = await topicIndex.get(page.title)
    assert(Boolean(topic), '偏好页应自动联动 Topic')
    assert(topic.memoryPageIds.includes(created.pageId), 'Topic 应关联 preference 页')
    assert(topic.chatRefs.includes('2026-06-30#pref-1'), 'Topic 应记录聊天来源')
    assert(topic.aliases.includes('咖啡'), 'Topic 应保留核心拆词别名，便于后续 query 命中')

    const updated = await upsertIdentityPreferenceFromConversation(store, {
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
    assert(updated.action === 'updated', '重复偏好表达应累计证据而不是新建')

    const refreshed = await memoryWiki.get(created.pageId)
    assert(refreshed.evidenceCount === 2, '重复表达后 evidenceCount 应累加')
    assert(refreshed.stabilityLevel === 'medium', '重复表达后稳定性应升级到 medium')
    assert(refreshed.sourceRefs.some((item) => item.kind === 'chat' && item.messageId === 'pref-2'), '第二次表达应追加来源')

    const repeatedSameSource = await upsertIdentityPreferenceFromConversation(store, {
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
    assert(repeatedSameSource.action === 'noop', '同源重复写入应保持幂等')

    const pages = await memoryWiki.list({
      pageType: 'identity_preference',
      status: 'active'
    })
    assert(pages.length === 1, '同一偏好重复表达后仍应只有一页')

    const neutralContext = await buildWikiContext(store, {
      date: '2026-07-01',
      baseDir,
      query: '',
      pageLimit: 6,
      topicLimit: 4
    })
    assert(!neutralContext.memorySummary.includes('[preference/'), '无 query 时 preference 页不应默认注入')

    const matchedContext = await buildWikiContext(store, {
      date: '2026-07-01',
      baseDir,
      query: '咖啡 太甜 饮品',
      pageLimit: 6,
      topicLimit: 4
    })
    assert(matchedContext.memorySummary.includes('[preference/饮食/medium]'), '相关 query 时应命中 preference 页')
    assert(matchedContext.memorySummary.includes('不喜欢'), '相关 query 时应带出 stance')

    const unrelatedContext = await buildWikiContext(store, {
      date: '2026-07-01',
      baseDir,
      query: '我想聊聊项目和考试',
      pageLimit: 6,
      topicLimit: 4
    })
    assert(!unrelatedContext.memorySummary.includes('咖啡'), '无关 query 时不应误带入无关 preference')

    console.log('verify-task402-identity-preference-evidence-and-injection: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
