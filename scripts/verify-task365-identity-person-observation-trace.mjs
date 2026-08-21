import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'
import { createObservationService } from '../electron/backend/observation/service.js'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { upsertIdentityPersonFromConversation } from '../electron/backend/identity/personUpsert.js'

async function run() {
  const harness = await createServiceHarness('task365-identity-person-observation-trace')
  const baseDir = harness.baseDir
  const store = harness.store

  try {
    const memoryWiki = await createMemoryWikiService({ baseDir, store })
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

    const observation = observationService.addNoteSmart({
      date: '2026-06-30',
      type: 'event',
      title: '用户提到初恋钟奕菲',
      content: '用户提到初恋钟奕菲，于2021年冬天相恋。',
      relatedRef: '2026-06-30',
      sourceText: '我的初恋名字叫钟奕菲，我们在2021年冬天相恋。'
    }).note
    assert(Boolean(observation?.id), '本轮应先形成 observation 记录')

    const created = await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'person-obs-1',
      userMessage: '我的初恋名字叫钟奕菲，我们在2021年冬天相恋。',
      observation,
      candidate: {
        personName: '钟奕菲',
        relationshipToUser: '初恋',
        timelineSummary: '2021年冬天相恋'
      }
    })

    assert(created.action === 'created', '首次重要人物提及应创建人物页')
    const personPage = await memoryWiki.get(created.pageId)
    assert(Array.isArray(personPage.sourceRefs), '人物页应带 sourceRefs')
    assert(personPage.sourceRefs.some((item) => item.kind === 'chat' && item.messageId === 'person-obs-1'), '人物页应保留 chat source')
    assert(personPage.sourceRefs.some((item) => item.kind === 'observation' && item.observationId === observation.id), '人物页应保留 observation source')

    const trace = await memoryWiki.getPageSourceTrace(created.pageId)
    assert(trace.chatSources.length >= 1, '人物页 trace 应能回查聊天来源')
    assert(trace.observationSources.some((item) => item.observationId === observation.id), '人物页 trace 应能回查 observation 来源')

    const topicIndex = await createTopicIndexStore(baseDir)
    const topic = await topicIndex.get('钟奕菲')
    assert(Boolean(topic), '人物 Topic 应存在')
    assert(topic.observationRefs.includes(`2026-06-30#${observation.id}`), '人物 Topic 应同步 observationRef')

    const second = await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'person-obs-1',
      userMessage: '我的初恋名字叫钟奕菲，我们在2021年冬天相恋。',
      observation,
      candidate: {
        personName: '钟奕菲',
        relationshipToUser: '初恋',
        timelineSummary: '2021年冬天相恋'
      }
    })
    assert(['noop', 'updated', 'conflict'].includes(second.action), '重复同源写入应保持幂等')

    const refreshed = await memoryWiki.get(created.pageId)
    assert(
      refreshed.sourceRefs.filter((item) => item.kind === 'observation' && item.observationId === observation.id).length === 1,
      '重复 observation source 不应重复写入'
    )

    const topicAfter = await topicIndex.get('钟奕菲')
    assert(topicAfter.observationRefs.filter((item) => item === `2026-06-30#${observation.id}`).length === 1, '重复 observationRef 不应重复写入')

    console.log('verify-task365-identity-person-observation-trace: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
