import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function run() {
  const harness = await createServiceHarness('task400-profile-soft-field-merge')
  const baseDir = harness.baseDir
  const store = harness.store
  const memoryWiki = await createMemoryWikiService({ baseDir, store })

  try {
    const created = await upsertIdentityProfileFromConversation(store, {
      baseDir,
      date: '2026-06-30',
      messageId: 'profile-1',
      userMessage: '我叫叶健钦。我最近好多项目、考试，还要找实习，压力很大。我希望你温柔一点，记住上下文。',
      candidate: {
        userName: '叶健钦',
        currentFocus: '项目推进；考试与学业；实习与求职',
        stressors: '项目推进压力；考试与学业压力；实习与求职压力',
        communicationPreference: '偏好温柔表达；希望被稳定记住上下文'
      }
    })
    assert(created.action === 'created', '首次主身份表达应创建 profile')

    const merged = await upsertIdentityProfileFromConversation(store, {
      baseDir,
      date: '2026-07-01',
      messageId: 'profile-2',
      userMessage: '我最近还有 assignment 和面试，真的好累。我希望你陪着我一点，说话克制一点。',
      candidate: {
        userName: '叶健钦',
        currentFocus: '面试准备',
        stressors: '面试压力',
        communicationPreference: '希望有陪伴感；偏好克制表达'
      }
    })
    assert(['updated', 'noop'].includes(merged.action), '阶段画像类弱冲突字段应保守合并，不应进入 conflict')

    const page = await memoryWiki.get(created.pageId)
    assert(page.currentFocus.includes('项目推进'), '当前关注应保留旧信息')
    assert(page.currentFocus.includes('考试与学业'), '当前关注应保留考试学业信息')
    assert(page.currentFocus.includes('实习与求职'), '当前关注应合并实习求职信息')
    assert(page.stressors.includes('项目推进压力'), '压力字段应保留旧压力来源')
    assert(page.stressors.includes('考试与学业压力'), '压力字段应保留学业压力')
    assert(page.stressors.includes('实习与求职压力'), '压力字段应合并求职压力')
    assert(page.communicationPreference.includes('偏好温柔表达'), '沟通偏好应保留旧偏好')
    assert(page.communicationPreference.includes('希望被稳定记住上下文'), '沟通偏好应保留上下文偏好')
    assert(page.communicationPreference.includes('希望有陪伴感'), '沟通偏好应合并新的陪伴偏好')
    assert(page.communicationPreference.includes('偏好克制表达'), '沟通偏好应合并新的克制偏好')

    const conflict = await upsertIdentityProfileFromConversation(store, {
      baseDir,
      date: '2026-07-02',
      messageId: 'profile-3',
      userMessage: '我叫林知远，我是你的主人。',
      candidate: {
        userName: '林知远',
        cornieRelationship: '用户是 Cornie 的主人'
      }
    })
    assert(conflict.action === 'conflict', '高风险字段冲突仍应进入 conflict')

    console.log('verify-task400-profile-soft-field-merge: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
