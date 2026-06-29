import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { createObservationService } from '../electron/backend/observation/service.js'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { upsertIdentityPersonFromConversation } from '../electron/backend/identity/personUpsert.js'

async function run() {
  const harness = await createServiceHarness('task366-person-timeline-trace')
  const baseDir = harness.baseDir
  const store = harness.store

  try {
    const memoryWiki = await createMemoryWikiService({ baseDir, store })
    const observationService = createObservationService(store)

    await upsertIdentityProfileFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'profile-1',
      userMessage: '我叫叶健钦，我是你的爸爸，也是你的创造者。'
    })

    const observation1 = observationService.recordConversationTurn({
      date: '2026-06-30',
      userMessage: '我的初恋名字叫钟奕菲，我们在2021年冬天相恋。',
      cornieMessage: '小铃湾记住啦。'
    })

    const first = await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'person-1',
      userMessage: '我的初恋名字叫钟奕菲，我们在2021年冬天相恋。',
      observation: observation1
    })

    const observation2 = observationService.recordConversationTurn({
      date: '2026-07-02',
      userMessage: '钟奕菲是我的初恋，她对我很重要。',
      cornieMessage: '小铃湾会记住这份意义。'
    })

    await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-07-02',
      messageId: 'person-2',
      userMessage: '钟奕菲是我的初恋，她对我很重要。',
      observation: observation2
    })

    const trace = await memoryWiki.getPageSourceTrace(first.pageId)
    assert(Boolean(trace.personTimelineTrace), '重要人物页 trace 应提供专项人物时间线聚合字段')
    assert(trace.personTimelineTrace.personName === '钟奕菲', '人物时间线聚合应带人物名')
    assert(trace.personTimelineTrace.chatDates.join(',') === '2026-06-30,2026-07-02', '应聚合并排序聊天日期')
    assert(trace.personTimelineTrace.observationDates.join(',') === '2026-06-30,2026-07-02', '应聚合并排序观察日志日期')
    assert(trace.personTimelineTrace.timeline.length === 2, '时间线应按日期去重')
    assert(trace.personTimelineTrace.timeline[0].date === '2026-06-30', '时间线应按日期升序排列')
    assert(trace.personTimelineTrace.timeline[1].date === '2026-07-02', '时间线应包含后续提及日期')
    assert(trace.personTimelineTrace.timeline.every((item) => item.hasChatSource && item.hasObservationSource), '本例时间线节点应能标记来源类型')
    assert(trace.personTimelineTrace.relatedMemoryPages.some((item) => item.pageType === 'identity_profile'), '人物时间线聚合应带相关记忆页入口')

    console.log('verify-task366-person-timeline-trace: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
