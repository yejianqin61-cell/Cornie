import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'
import { createObservationService } from '../electron/backend/observation/service.js'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { upsertIdentityPersonFromConversation } from '../electron/backend/identity/personUpsert.js'

async function run() {
  const harness = await createServiceHarness('task401-identity-person-rules-and-linking')
  const baseDir = harness.baseDir
  const store = harness.store

  try {
    const memoryWiki = await createMemoryWikiService({ baseDir, store })
    const topicIndex = await createTopicIndexStore(baseDir)
    const observationService = createObservationService(store)

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

    const lowValue = await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'person-low-1',
      userMessage: '今天路上有个路人跟我打了招呼。'
    })
    assert(lowValue.action === 'skipped', '普通路人提及不应误建人物页')

    const observation = observationService.addNoteSmart({
      date: '2026-06-30',
      type: 'event',
      title: '用户提到初恋钟奕菲',
      content: '用户提到初恋钟奕菲，她很温柔，2021年冬天相恋。',
      relatedRef: '2026-06-30',
      sourceText: '我的初恋名字叫钟奕菲，她很温柔，我们在2021年冬天相恋。'
    }).note
    assert(Boolean(observation?.id), '应先形成 observation 来源')

    const created = await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'person-1',
      userMessage: '我的初恋名字叫钟奕菲，她很温柔，我们在2021年冬天相恋。',
      observation,
      candidate: {
        personName: '钟奕菲',
        relationshipToUser: '初恋',
        personalitySummary: '温柔',
        firstKnownPeriod: '2021年冬天'
      }
    })
    assert(created.action === 'created', '高确定性人物信息应创建人物页')

    const page = await memoryWiki.get(created.pageId)
    assert(page.personName === '钟奕菲', '人物页应记录人物名字')
    assert(page.relationshipToUser === '初恋', '人物页应记录关系')
    assert(page.personalitySummary.length > 0, '人物页应保守提取人物性格')
    assert(page.firstKnownPeriod.length > 0, '人物页应提取首次已知时期')
    assert(page.lastMentionedAt === '2026-06-30', '人物页应记录最后提及日期')
    assert(page.sourceRefs.some((item) => item.kind === 'chat' && item.messageId === 'person-1'), '人物页应挂聊天来源')
    assert(page.sourceRefs.some((item) => item.kind === 'observation' && item.observationId === observation.id), '人物页应挂观察来源')

    const profileSummaries = await memoryWiki.listSummaries({
      pageType: 'identity_profile',
      status: 'active'
    })
    const profilePage = await memoryWiki.get(profileSummaries[0].pageId)
    assert((profilePage.relatedPageIds || []).includes(created.pageId), '主身份页应自动反链人物页')
    assert((page.relatedPageIds || []).includes(profilePage.pageId), '人物页应自动反链主身份页')

    const topic = await topicIndex.get('钟奕菲')
    assert(Boolean(topic), '人物页应联动建立 Topic')
    assert(topic.memoryPageIds.includes(created.pageId), 'Topic 应联动人物页')
    assert(topic.chatRefs.includes('2026-06-30#person-1'), 'Topic 应记录聊天来源')
    assert(topic.observationRefs.includes(`2026-06-30#${observation.id}`), 'Topic 应记录 observation 来源')

    const trace = await memoryWiki.getPageSourceTrace(created.pageId)
    assert(trace.chatSources.length >= 1, '人物页来源 trace 应能回查聊天来源')
    assert(trace.observationSources.some((item) => item.observationId === observation.id), '人物页来源 trace 应能回查 observation 来源')
    assert(trace.personTimelineTrace.personName === '钟奕菲', '人物页来源 trace 应带人物时间线聚合')

    const repeated = await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-07-01',
      messageId: 'person-2',
      userMessage: '钟奕菲是我的初恋。',
      candidate: {
        personName: '钟奕菲',
        relationshipToUser: '初恋'
      }
    })
    assert(['updated', 'noop'].includes(repeated.action), '重复提及同一人物应更新而不是新建')

    const people = await memoryWiki.list({
      pageType: 'identity_person',
      status: 'active'
    })
    assert(people.length === 1, '重复提及同一人物后仍应只有一张人物页')

    const conflict = await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-07-02',
      messageId: 'person-3',
      userMessage: '钟奕菲是我的朋友。',
      candidate: {
        personName: '钟奕菲',
        relationshipToUser: '朋友'
      }
    })
    assert(conflict.action === 'conflict', '关系冲突时应返回 conflict')

    console.log('verify-task401-identity-person-rules-and-linking: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
