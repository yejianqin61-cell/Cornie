import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { createObservationService } from '../electron/backend/observation/service.js'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { upsertIdentityPersonFromConversation } from '../electron/backend/identity/personUpsert.js'
import { createTopicIndexStore } from '../electron/backend/memory-wiki/topicIndex.js'
import { saveMessage } from '../electron/db.js'

async function run() {
  const harness = await createServiceHarness('task369-topic-trace-normalization')
  const baseDir = harness.baseDir
  const store = harness.store

  try {
    const memoryWiki = await createMemoryWikiService({ baseDir, store })
    const observationService = createObservationService(store)
    const topicIndex = await createTopicIndexStore(baseDir)

    await upsertIdentityProfileFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'profile-1',
      userMessage: '我叫叶健钦，我的初恋名字叫钟奕菲。'
    })

    const observation1 = observationService.recordConversationTurn({
      date: '2026-06-30',
      userMessage: '我的初恋名字叫钟奕菲，我们在2021年冬天相恋。',
      cornieMessage: '小铃湾记住啦。'
    })
    saveMessage(store, {
      id: 'person-1',
      date: '2026-06-30',
      role: 'user',
      content: '我的初恋名字叫钟奕菲，我们在2021年冬天相恋。'
    })

    await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'person-1',
      userMessage: '我的初恋名字叫钟奕菲，我们在2021年冬天相恋。',
      observation: observation1
    })

    const observation2 = observationService.recordConversationTurn({
      date: '2026-07-02',
      userMessage: '钟奕菲是我的初恋，她对我很重要。',
      cornieMessage: '小铃湾会认真记着这份重要。'
    })
    saveMessage(store, {
      id: 'person-2',
      date: '2026-07-02',
      role: 'user',
      content: '钟奕菲是我的初恋，她对我很重要。'
    })

    await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-07-02',
      messageId: 'person-2',
      userMessage: '钟奕菲是我的初恋，她对我很重要。',
      observation: observation2
    })

    const topic = await topicIndex.get('钟奕菲')
    assert(Boolean(topic), '应存在人物主题索引')

    const trace = await memoryWiki.getTopicSourceTrace('钟奕菲')
    assert(Array.isArray(trace.chatSources), '主题来源反查应返回聊天来源列表')
    assert(Array.isArray(trace.observationSources), '主题来源反查应返回观察来源列表')
    assert(Boolean(trace.topicTimelineTrace), '主题来源反查应返回主题时间线聚合字段')
    assert(trace.chatSources.some((item) => item.date === '2026-06-30' && item.messageId === 'person-1' && item.exists), '聊天来源应按 date#messageId 标准化拆解')
    assert(trace.chatSources.some((item) => item.date === '2026-07-02' && item.messageId === 'person-2' && item.exists), '聊天来源应能回查后续对话消息')
    assert(trace.observationSources.some((item) => item.date === '2026-06-30' && item.observationId === observation1.id && item.exists), '观察来源应按 date#observationId 标准化拆解')
    assert(trace.observationSources.some((item) => item.date === '2026-07-02' && item.observationId === observation2.id && item.exists), '观察来源应能回查后续观察日志')
    assert(trace.topicTimelineTrace.chatDates.join(',') === '2026-06-30,2026-07-02', '主题时间线应聚合聊天日期')
    assert(trace.topicTimelineTrace.observationDates.join(',') === '2026-06-30,2026-07-02', '主题时间线应聚合观察日期')
    assert(trace.topicTimelineTrace.timeline.length === 2, '主题时间线应按日期去重')
    assert(trace.topicTimelineTrace.timeline.every((item) => item.hasChatSource && item.hasObservationSource), '主题时间线节点应标记来源类型')

    console.log('verify-task369-topic-trace-normalization: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
