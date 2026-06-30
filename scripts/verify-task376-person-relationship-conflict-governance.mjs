import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { upsertIdentityPersonFromConversation } from '../electron/backend/identity/personUpsert.js'

async function run() {
  const harness = await createServiceHarness('task376-person-relationship-conflict-governance')
  const baseDir = harness.baseDir
  const store = harness.store
  const memoryWiki = await createMemoryWikiService({ baseDir, store })

  await upsertIdentityProfileFromConversation(store, {
    baseDir,
    date: '2026-06-30',
    messageId: 'profile-1',
    userMessage: '我叫叶健钦，我是你的爸爸，也是你的创造者。'
  })

  const created = await upsertIdentityPersonFromConversation(store, {
    baseDir,
    date: '2026-06-30',
    messageId: 'person-1',
    userMessage: '我的初恋名字叫钟奕菲。'
  })
  assert(created.pageId, '应先建立重要人物页')

  const conflict = await upsertIdentityPersonFromConversation(store, {
    baseDir,
    date: '2026-07-01',
    messageId: 'person-2',
    userMessage: '钟奕菲是我的朋友。'
  })
  assert(conflict.action === 'conflict', '关系冲突时应返回 conflict')

  const governanceRequests = await memoryWiki.listGovernanceRequests({
    requestType: 'identity_person_relationship_conflict',
    queueSection: 'identity_person_reviews'
  })
  assert(governanceRequests.length >= 1, '关系冲突应进入治理候选池')

  const request = governanceRequests[0]
  assert(Array.isArray(request.evidence) && request.evidence.length >= 1, '治理候选应保留冲突证据')
  assert(request.evidence.some((item) => item.field === 'relationshipToUser'), '治理候选应标出关系字段冲突')
  assert(
    request.evidence.some((item) => item.existingValue === '初恋' && item.incomingValue === '朋友'),
    '治理候选应保留旧值与新值'
  )

  const personPage = await memoryWiki.get(created.pageId)
  assert(personPage.relationshipToUser === '初恋', '正式页不应被冲突输入直接覆盖')

  await harness.close()
  console.log('verify-task376-person-relationship-conflict-governance: ok')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
