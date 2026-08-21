import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createObservationService } from '../electron/backend/observation/service.js'

async function run() {
  const harness = await createServiceHarness('task391-observation-chat-message-anchor')

  try {
    const observation = createObservationService(harness.store)

    const anchored = observation.addNoteSmart({
      date: '2026-06-30',
      type: 'event',
      title: '又想起钟奕菲',
      content: '用户今天又想起钟奕菲，这件事对其很重要。',
      relatedRef: '2026-06-30#msg-user-001',
      sourceText: '我今天又想起钟奕菲了，这件事对我很重要。'
    }).note
    assert(Boolean(anchored), '符合记录条件时应自动生成 observation')
    assert(anchored.relatedRef === '2026-06-30#msg-user-001', '自动 observation 应写入消息级来源锚点')

    const fallback = observation.addNoteSmart({
      date: '2026-07-01',
      type: 'event',
      title: '买了矿泉水',
      content: '用户今天买了矿泉水并希望记录下来。',
      relatedRef: '2026-07-01',
      sourceText: '今天买了矿泉水，也记一下吧。'
    }).note
    assert(Boolean(fallback), '缺少 messageId 时 observation 仍应正常写入')
    assert(fallback.relatedRef === '2026-07-01', '缺少 messageId 时应降级回日期级来源锚点')

    const listed = observation.listByDate('2026-06-30')
    assert(listed.some((item) => item.relatedRef === '2026-06-30#msg-user-001'), '按日读取时应能看到消息级 relatedRef')

    console.log('verify-task391-observation-chat-message-anchor: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
