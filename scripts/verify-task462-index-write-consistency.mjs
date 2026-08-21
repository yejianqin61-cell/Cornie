import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function run() {
  const harness = await createServiceHarness('task462-index-write-consistency')
  const memoryWiki = await createMemoryWikiService({
    baseDir: harness.baseDir,
    store: harness.store
  })

  try {
    // 1) 并发创建页面：10 个并发 create，page-index 不丢更新
    const tasks = Array.from({ length: 10 }, (_, i) =>
      memoryWiki.create({ pageType: 'event', title: `并发事件${i}`, summary: `s${i}` })
    )
    const created = await Promise.all(tasks)
    assert(created.every((item) => item?.pageId), '10 个并发 create 应全部成功')

    const listAll = await memoryWiki.list({})
    assert(listAll.length === 10, 'page-index 不应丢更新', { expected: 10, actual: listAll.length })

    // 2) 并发治理请求：20 个并发 createGovernanceRequest，review-queue 不丢
    const govTasks = Array.from({ length: 20 }, (_, i) =>
      memoryWiki.createGovernanceRequest({
        requestType: 'concurrency_test',
        queueSection: 'concurrency_test',
        riskLevel: 'low',
        title: `req-${i}`,
        reason: '并发写入测试'
      })
    )
    const govCreated = await Promise.all(govTasks)
    assert(govCreated.length === 20, '20 个并发治理请求应全部成功')

    const govQueue = await memoryWiki.listGovernanceRequests({ queueSection: 'concurrency_test' })
    assert(govQueue.length === 20, '治理队列不应丢更新', { expected: 20, actual: govQueue.length })

    // 3) 并发 topicIndex 链接：同一主题并发 linkPage 不同页，memoryPageIds 完整
    const topicIndex = memoryWiki.getTopicIndex()
    const linkTasks = created.map((page, i) => topicIndex.linkPage('并发主题', page.pageId))
    await Promise.all(linkTasks)
    const topic = await topicIndex.get('并发主题')
    assert(
      (topic?.memoryPageIds ?? []).length === 10,
      'topicIndex 并发 linkPage 不应丢更新',
      topic?.memoryPageIds?.length
    )

    console.log('verify-task462-index-write-consistency: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
