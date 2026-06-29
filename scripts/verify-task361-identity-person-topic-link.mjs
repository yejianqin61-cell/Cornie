import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'
import { upsertIdentityPersonFromConversation } from '../electron/backend/identity/personUpsert.js'

async function main() {
  const harness = await createServiceHarness('task361-identity-person-topic-link')
  const baseDir = harness.baseDir
  const store = harness.store

  try {
    const memoryWiki = await createMemoryWikiService({ baseDir, store })
    await memoryWiki.create({
      pageType: 'identity_profile',
      title: '用户主身份',
      userName: '叶健钦',
      preferredName: '爸爸',
      cornieRelationship: 'Cornie 的创造者和爸爸'
    })

    const first = await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'msg-001',
      userMessage: '我的初恋名字叫钟奕菲，我们在2021年冬天相恋。'
    })

    assert(first.action === 'created', '首次高确定性人物提及应创建 identity_person 页面')
    assert(Boolean(first.pageId), '首次创建后应返回 pageId')

    const topicIndex = await createTopicIndexStore(baseDir)
    const topic = await topicIndex.get('钟奕菲')
    assert(Boolean(topic), '首次创建人物页后应自动生成 Topic')
    assert(topic.keyword === '钟奕菲', '人物 Topic 应以人名作为主 keyword')
    assert(topic.memoryPageIds.includes(first.pageId), '人物 Topic 应关联人物页')
    assert(topic.dates.includes('2026-06-30'), '人物 Topic 应记录提及日期')
    assert(topic.chatRefs.includes('2026-06-30#msg-001'), '人物 Topic 应记录聊天来源')

    const second = await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-07-02',
      messageId: 'msg-002',
      userMessage: '钟奕菲是我的初恋，她对我很重要。'
    })

    assert(['updated', 'noop', 'conflict'].includes(second.action), '再次提及时应增量更新或保守冲突处理')

    const topicAfter = await topicIndex.get('钟奕菲')
    assert(topicAfter.dates.includes('2026-07-02'), '再次提及时应补齐新的日期')
    assert(topicAfter.chatRefs.includes('2026-07-02#msg-002'), '再次提及时应补齐新的聊天来源')
    assert(topicAfter.memoryPageIds.filter((item) => item === first.pageId).length === 1, '人物页链接应保持去重')

    const third = await upsertIdentityPersonFromConversation(store, {
      baseDir,
      date: '2026-07-02',
      messageId: 'msg-002',
      userMessage: '钟奕菲是我的初恋，她对我很重要。'
    })

    assert(['noop', 'conflict', 'updated'].includes(third.action), '重复同源写入不应破坏幂等性')

    const topicFinal = await topicIndex.get('钟奕菲')
    assert(topicFinal.dates.filter((item) => item === '2026-07-02').length === 1, '日期引用应保持去重')
    assert(topicFinal.chatRefs.filter((item) => item === '2026-07-02#msg-002').length === 1, '聊天来源应保持去重')

    console.log('verify-task361-identity-person-topic-link: ok')
  } finally {
    await harness.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
