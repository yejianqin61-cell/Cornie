import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { saveMessage } from '../electron/db.js'
import { createChatlogService } from '../electron/backend/chatlog/service.js'
import { createObservationService } from '../electron/backend/observation/service.js'
import { createMemoryWikiService, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { upsertIdentityPersonFromConversation } from '../electron/backend/identity/personUpsert.js'

async function run() {
  const harness = await createServiceHarness('task405-cross-source-recall-closure')
  const baseDir = harness.baseDir
  const store = harness.store

  try {
    const chatlog = createChatlogService(store, { dbPath: store.dbPath })
    const observationService = createObservationService(store)
    const memoryWiki = await createMemoryWikiService({ baseDir, store })
    const topicIndex = await createTopicIndexStore(baseDir)

    await upsertIdentityProfileFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'profile-1',
      userMessage: '我叫叶健钦，我是你的爸爸，我的初恋名字叫钟奕菲。',
      candidate: {
        userName: '叶健钦',
        cornieRelationship: '用户是 Cornie 的爸爸'
      }
    })

    saveMessage(store, {
      id: 'chat-1',
      date: '2026-06-30',
      role: 'user',
      content: '我的初恋名字叫钟奕菲，我们在2021年冬天相恋。'
    })
    const observation1 = observationService.addNoteSmart({
      date: '2026-06-30',
      type: 'event',
      title: '用户提到初恋钟奕菲',
      content: '用户提到初恋钟奕菲，2021年冬天相恋。',
      relatedRef: '2026-06-30',
      sourceText: '我的初恋名字叫钟奕菲，我们在2021年冬天相恋。'
    }).note
    const first = await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'chat-1',
      userMessage: '我的初恋名字叫钟奕菲，我们在2021年冬天相恋。',
      observation: observation1,
      candidate: {
        personName: '钟奕菲',
        relationshipToUser: '初恋',
        timelineSummary: '2021年冬天相恋'
      }
    })

    saveMessage(store, {
      id: 'chat-2',
      date: '2026-07-02',
      role: 'user',
      content: '钟奕菲是我的初恋，她对我很重要。'
    })
    const observation2 = observationService.addNoteSmart({
      date: '2026-07-02',
      type: 'event',
      title: '用户重申钟奕菲的重要性',
      content: '用户重申钟奕菲是初恋，对其很重要。',
      relatedRef: '2026-07-02',
      sourceText: '钟奕菲是我的初恋，她对我很重要。'
    }).note
    await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-07-02',
      messageId: 'chat-2',
      userMessage: '钟奕菲是我的初恋，她对我很重要。',
      observation: observation2,
      candidate: {
        personName: '钟奕菲',
        relationshipToUser: '初恋'
      }
    })

    const topic = await topicIndex.get('钟奕菲')
    assert(Boolean(topic), '应存在对应 Topic')
    assert(topic.chatRefs.includes('2026-06-30#chat-1'), 'Topic 应记录聊天来源 1')
    assert(topic.chatRefs.includes('2026-07-02#chat-2'), 'Topic 应记录聊天来源 2')
    assert(topic.observationRefs.includes(`2026-06-30#${observation1.id}`), 'Topic 应记录 observation 来源 1')
    assert(topic.observationRefs.includes(`2026-07-02#${observation2.id}`), 'Topic 应记录 observation 来源 2')
    assert(topic.memoryPageIds.includes(first.pageId), 'Topic 应关联人物页')

    const topicTrace = await memoryWiki.getTopicSourceTrace('钟奕菲')
    assert(topicTrace.chatSources.length === 2, 'Topic trace 应能回查两条聊天来源')
    assert(topicTrace.observationSources.length === 2, 'Topic trace 应能回查两条 observation 来源')
    assert(topicTrace.relatedPages.some((item) => item.pageId === first.pageId), 'Topic trace 应带相关记忆页')
    assert(topicTrace.topicTimelineTrace.chatDates.join(',') === '2026-06-30,2026-07-02', 'Topic 时间线应聚合聊天日期')

    const pageTrace = await memoryWiki.getPageSourceTrace(first.pageId)
    assert(pageTrace.chatSources.some((item) => item.date === '2026-06-30' && item.messageId === 'chat-1' && item.exists), '人物页 trace 应回查 chat-1')
    assert(pageTrace.observationSources.some((item) => item.observationId === observation1.id && item.exists), '人物页 trace 应回查 observation-1')

    const snippets = chatlog.searchMessageSnippets('钟奕菲', {
      scope: 'all',
      limit: 10,
      cursor: 0
    })
    assert(snippets.items.length === 2, '聊天片段检索应命中两条相关聊天')
    assert(snippets.items.some((item) => item.messageId === 'chat-1'), '片段检索应能反查第一条聊天')
    assert(snippets.items.some((item) => item.messageId === 'chat-2'), '片段检索应能反查第二条聊天')

    const observationRecall = observationService.listByRecall({ person: '钟奕菲', limit: 10 })
    assert(observationRecall.length === 2, '观察日志 recall 应能命中对应人物的 observation')

    console.log('verify-task405-cross-source-recall-closure: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
