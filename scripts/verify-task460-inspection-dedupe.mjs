import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function run() {
  const harness = await createServiceHarness('task460-inspection-dedupe')
  const memoryWiki = await createMemoryWikiService({
    baseDir: harness.baseDir,
    store: harness.store
  })

  try {
    // 构造巡检问题：页面存在但 topicIndex 引用了不存在的页面（broken link）
    await memoryWiki.create({ pageType: 'event', title: '龙虾观察', summary: '主题' })
    const topicIndex = memoryWiki.getTopicIndex()
    await topicIndex.upsert({
      keyword: '龙虾',
      normalizedKey: '龙虾',
      aliases: ['龙虾'],
      memoryPageIds: ['topic_missing_page_1']
    })
    await topicIndex.linkPage('龙虾', 'topic_missing_page_1')

    // 1) 第一次巡检：应产生 broken-link 治理请求
    const first = await memoryWiki.enqueueInspectionGovernanceRequests()
    const brokenRequests = first.items.filter((item) => item.requestType === 'repair_suggestion')
    assert(brokenRequests.length >= 1, '第一次巡检应产生修复建议', first)

    // 2) 第二次巡检：同一问题不应重复入队
    const second = await memoryWiki.enqueueInspectionGovernanceRequests()
    const secondBroken = second.items.filter((item) => item.requestType === 'repair_suggestion')
    assert(secondBroken.length === 0, '第二次巡检应零重复入队', second)

    // 3) 治理队列中该问题只有一条 pending
    const queue = await memoryWiki.listGovernanceRequests({ queueSection: 'repair_suggestions', status: 'pending' })
    const sameIssue = queue.filter((item) => item.title === 'missing_topic_page_link')
    assert(sameIssue.length === 1, '同一问题应只有一条 pending 请求', sameIssue.length)

    console.log('verify-task460-inspection-dedupe: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
