import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'
import { upsertIdentityTraitFromConversation } from '../electron/backend/identity/traitUpsert.js'

async function run() {
  const harness = await createServiceHarness('task385-trait-topic-linking')

  try {
    const baseDir = harness.baseDir
    const store = harness.store
    const topicIndex = await createTopicIndexStore(baseDir)

    const first = await upsertIdentityTraitFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'trait-1',
      userMessage: '我最近真的好累，压力很大，但还是会继续把项目往前推。'
    })
    assert(first.pageId, '应先创建 trait 页')

    const topic = await topicIndex.get('高压下容易疲惫')
    assert(Boolean(topic), '首次 trait 沉淀后应自动生成对应 Topic')
    assert(topic.keyword === '高压下容易疲惫', 'trait Topic 应以 trait 标题作为主 keyword')
    assert(topic.memoryPageIds.includes(first.pageId), 'trait Topic 应链接到 trait 页')
    assert(topic.dates.includes('2026-06-30'), 'trait Topic 应写入日期来源')
    assert(topic.chatRefs.includes('2026-06-30#trait-1'), 'trait Topic 应写入聊天来源')
    assert(topic.aliases.includes('压力反应'), 'trait Topic 应保留 traitType 别名')

    const second = await upsertIdentityTraitFromConversation(store, {
      baseDir,
      date: '2026-07-01',
      messageId: 'trait-2',
      userMessage: '我最近特别累，压力很大，但还是想把事情往前推进。'
    })
    assert(['updated', 'noop'].includes(second.action), '同一 trait 的后续表达应增量合并')

    const refreshedTopic = await topicIndex.get('高压下容易疲惫')
    assert(refreshedTopic.dates.includes('2026-07-01'), 'trait Topic 应增量补齐新日期')
    assert(refreshedTopic.chatRefs.includes('2026-07-01#trait-2'), 'trait Topic 应增量补齐新聊天来源')

    await upsertIdentityTraitFromConversation(store, {
      baseDir,
      date: '2026-07-01',
      messageId: 'trait-2',
      userMessage: '我最近特别累，压力很大，但还是想把事情往前推进。'
    })

    const dedupedTopic = await topicIndex.get('高压下容易疲惫')
    assert(dedupedTopic.dates.filter((item) => item === '2026-07-01').length === 1, '重复执行不应重复写入日期')
    assert(dedupedTopic.chatRefs.filter((item) => item === '2026-07-01#trait-2').length === 1, '重复执行不应重复写入聊天来源')
    assert(dedupedTopic.memoryPageIds.filter((item) => item === first.pageId).length === 1, '重复执行不应重复写入 pageId')

    console.log('verify-task385-trait-topic-linking: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
