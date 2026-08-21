import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'
import { upsertIdentityPreferenceFromConversation } from '../electron/backend/identity/preferenceUpsert.js'

async function run() {
  const harness = await createServiceHarness('task384-preference-topic-linking')

  try {
    const baseDir = harness.baseDir
    const store = harness.store
    const memoryWiki = await createMemoryWikiService({ baseDir, store })
    const topicIndex = await createTopicIndexStore(baseDir)

    const first = await upsertIdentityPreferenceFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'pref-1',
      userMessage: '我喜欢奶茶。',
      candidate: {
        title: '奶茶',
        stance: '喜欢',
        preferenceType: '饮食',
        triggerKeywords: ['奶茶']
      }
    })
    assert(first.pageId, '应先创建偏好页')

    const topic = await topicIndex.get('奶茶')
    assert(Boolean(topic), '首次偏好沉淀后应自动生成对应 Topic')
    assert(topic.keyword === '奶茶', '偏好 Topic 应以偏好标题作为主 keyword')
    assert(topic.memoryPageIds.includes(first.pageId), '偏好 Topic 应链接到偏好页')
    assert(topic.dates.includes('2026-06-30'), '偏好 Topic 应写入日期来源')
    assert(topic.chatRefs.includes('2026-06-30#pref-1'), '偏好 Topic 应写入聊天来源')
    assert(topic.aliases.includes('喜欢'), '偏好 Topic 应保留 stance 别名')

    const page = await memoryWiki.get(first.pageId)
    assert(page.title === '奶茶', '偏好页标题应保持原始偏好主题')

    const second = await upsertIdentityPreferenceFromConversation(store, {
      baseDir,
      date: '2026-07-01',
      messageId: 'pref-2',
      userMessage: '我更喜欢奶茶。',
      candidate: {
        title: '奶茶',
        stance: '喜欢',
        preferenceType: '饮食',
        triggerKeywords: ['奶茶']
      }
    })
    assert(['updated', 'noop'].includes(second.action), '重复偏好主题的后续表达应增量合并')

    const refreshedTopic = await topicIndex.get('奶茶')
    assert(refreshedTopic.dates.includes('2026-07-01'), '偏好 Topic 应增量补齐新日期')
    assert(refreshedTopic.chatRefs.includes('2026-07-01#pref-2'), '偏好 Topic 应增量补齐新聊天来源')

    await upsertIdentityPreferenceFromConversation(store, {
      baseDir,
      date: '2026-07-01',
      messageId: 'pref-2',
      userMessage: '我更喜欢奶茶。',
      candidate: {
        title: '奶茶',
        stance: '喜欢',
        preferenceType: '饮食',
        triggerKeywords: ['奶茶']
      }
    })

    const dedupedTopic = await topicIndex.get('奶茶')
    assert(dedupedTopic.dates.filter((item) => item === '2026-07-01').length === 1, '重复执行不应重复写入日期')
    assert(dedupedTopic.chatRefs.filter((item) => item === '2026-07-01#pref-2').length === 1, '重复执行不应重复写入聊天来源')
    assert(dedupedTopic.memoryPageIds.filter((item) => item === first.pageId).length === 1, '重复执行不应重复写入 pageId')

    console.log('verify-task384-preference-topic-linking: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
