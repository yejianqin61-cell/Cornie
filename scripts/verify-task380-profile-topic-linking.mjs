import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function run() {
  const harness = await createServiceHarness('task380-profile-topic-linking')
  const baseDir = harness.baseDir
  const store = harness.store
  const memoryWiki = await createMemoryWikiService({ baseDir, store })
  const topicIndex = await createTopicIndexStore(baseDir)

  const created = await upsertIdentityProfileFromConversation(store, {
    baseDir,
    date: '2026-06-30',
    messageId: 'profile-1',
    userMessage: '我叫叶健钦，我是你的创造者，也是你爸爸。',
    candidate: {
      userName: '叶健钦',
      cornieRelationship: '用户是 Cornie 的创造者和爸爸'
    }
  })
  assert(created.pageId, '应先创建主身份页')

  const topic = await topicIndex.get('叶健钦')
  assert(topic, '首次主身份沉淀后应自动生成对应 Topic')
  assert(topic.keyword === '叶健钦', '主身份 Topic 应以用户名作为主 keyword')
  assert(topic.memoryPageIds.includes(created.pageId), '主身份 Topic 应链接到主身份页')
  assert(topic.dates.includes('2026-06-30'), '主身份 Topic 应写入日期来源')
  assert(topic.chatRefs.includes('2026-06-30#profile-1'), '主身份 Topic 应写入聊天来源')

  const updated = await upsertIdentityProfileFromConversation(store, {
    baseDir,
    date: '2026-07-01',
    messageId: 'profile-2',
    userMessage: '以后你叫我爸爸。',
    candidate: {
      userName: '叶健钦',
      preferredName: '爸爸'
    }
  })
  assert(['updated', 'noop'].includes(updated.action), '补充偏好称呼应保守写入主身份页')

  const refreshedTopic = await topicIndex.get('叶健钦')
  assert(refreshedTopic.aliases.includes('爸爸'), '主身份 Topic 应增量补入 preferredName/称呼别名')
  assert(refreshedTopic.dates.includes('2026-07-01'), '主身份 Topic 应增量补入新日期')
  assert(refreshedTopic.chatRefs.includes('2026-07-01#profile-2'), '主身份 Topic 应增量补入新聊天来源')

  const page = await memoryWiki.get(created.pageId)
  assert(page.preferredName === '爸爸', '主身份页本身也应写入 preferredName')

  const duplicated = await upsertIdentityProfileFromConversation(store, {
    baseDir,
    date: '2026-07-01',
    messageId: 'profile-2',
    userMessage: '以后你叫我爸爸。',
    candidate: {
      userName: '叶健钦',
      preferredName: '爸爸'
    }
  })
  assert(['noop', 'updated'].includes(duplicated.action), '重复消息写入应保持幂等')

  const dedupedTopic = await topicIndex.get('叶健钦')
  assert(dedupedTopic.dates.filter((item) => item === '2026-07-01').length === 1, '重复执行不应重复写入日期')
  assert(dedupedTopic.chatRefs.filter((item) => item === '2026-07-01#profile-2').length === 1, '重复执行不应重复写入 chatRefs')
  assert(dedupedTopic.memoryPageIds.filter((item) => item === created.pageId).length === 1, '重复执行不应重复写入 memoryPageIds')

  await harness.close()
  console.log('verify-task380-profile-topic-linking: ok')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
