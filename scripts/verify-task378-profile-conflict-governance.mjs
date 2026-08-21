import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'

async function run() {
  const harness = await createServiceHarness('task378-profile-conflict-governance')
  const baseDir = harness.baseDir
  const store = harness.store
  const memoryWiki = await createMemoryWikiService({ baseDir, store })

  const created = await upsertIdentityProfileFromConversation(store, {
    baseDir,
    date: '2026-06-30',
    messageId: 'profile-1',
    userMessage: '我叫叶健钦，我是你的爸爸。',
    candidate: {
      userName: '叶健钦',
      cornieRelationship: '用户是 Cornie 的爸爸'
    }
  })
  assert(created.pageId, '应先建立主身份页')

  const conflict = await upsertIdentityProfileFromConversation(store, {
    baseDir,
    date: '2026-07-01',
    messageId: 'profile-2',
    userMessage: '我叫林知远，我是你的主人。',
    candidate: {
      userName: '林知远',
      cornieRelationship: '用户是 Cornie 的主人'
    }
  })
  assert(conflict.action === 'conflict', '主身份高风险字段冲突时应返回 conflict')

  const governanceRequests = await memoryWiki.listGovernanceRequests({
    requestType: 'identity_profile_conflict',
    queueSection: 'identity_profile_reviews'
  })
  assert(governanceRequests.length >= 1, '主身份冲突应进入治理候选池')

  const request = governanceRequests[0]
  assert(Array.isArray(request.evidence) && request.evidence.length >= 1, '治理候选应保留冲突证据')
  assert(request.evidence.some((item) => item.field === 'userName'), '治理候选应包含用户名冲突')
  assert(request.evidence.some((item) => item.field === 'cornieRelationship'), '治理候选应包含与 Cornie 关系冲突')
  assert(
    request.evidence.some((item) => item.existingValue === '叶健钦' && item.incomingValue === '林知远'),
    '治理候选应保留名字旧值与新值'
  )

  const profilePage = await memoryWiki.get(created.pageId)
  assert(profilePage.userName === '叶健钦', '正式主身份页不应被冲突输入直接覆盖')
  assert(profilePage.cornieRelationship === '用户是 Cornie 的爸爸', '正式主身份页关系不应被冲突输入直接覆盖')

  await harness.close()
  console.log('verify-task378-profile-conflict-governance: ok')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
