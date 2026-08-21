import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'

// 447：治理审批仅在 created/updated（真实写入且无冲突）时置 ownerConfirmed；
// conflict 场景保持 false，等待人类治理。

async function createGovernanceRequest(memoryWiki, { candidate, messageId, observationId }) {
  return memoryWiki.createGovernanceRequest({
    requestType: 'identity_profile_upgrade_candidate',
    triggerSource: 'memory_distillation',
    queueSection: 'wiki_upgrade_candidates',
    riskLevel: 'high',
    title: candidate.userName || '主身份升级候选',
    reason: '验证 447：ownerConfirmed 冲突保护。',
    evidence: [
      {
        observationId,
        date: '2026-08-21',
        type: 'event',
        title: '身份线索',
        content: '对话中出现身份线索。',
        messageId,
        sourceText: `我叫${candidate.userName || '某人'}`
      },
      { candidateType: 'identity_profile_upgrade_candidate', candidate }
    ],
    payload: { action: 'upgrade_identity_profile_from_observation', candidate }
  })
}

async function run() {
  const harness = await createServiceHarness('task447-owner-confirmed-conflict')

  try {
    const memoryWiki = await createMemoryWikiService({
      baseDir: harness.baseDir,
      store: harness.store
    })

    // 1. 先直建主身份页（不经治理审批），ownerConfirmed 应为 false
    const directWrite = await upsertIdentityProfileFromConversation(harness.store, {
      baseDir: harness.baseDir,
      date: '2026-08-21',
      messageId: 'm-direct',
      userMessage: '我叫叶健钦',
      candidate: { userName: '叶健钦' }
    })
    assert(directWrite.action === 'created', '直建主身份页应 created')
    const directPage = await memoryWiki.get(directWrite.pageId)
    assert(directPage.ownerConfirmed === false, '直建页面默认 ownerConfirmed false')

    // 2. conflict 场景：冲突候选 → 动作 conflict → ownerConfirmed 保持 false
    const conflictRequest = await createGovernanceRequest(memoryWiki, {
      candidate: { userName: '谁啊' },
      messageId: 'm-conflict',
      observationId: 'obs-conflict'
    })
    const conflictResult = await memoryWiki.applyGovernanceUpgradeRequest(conflictRequest.requestId)
    assert(conflictResult.applyResult.action === 'conflict', '冲突候选应产生 conflict 动作')
    const pageAfterConflict = await memoryWiki.get(conflictResult.page.pageId)
    assert(pageAfterConflict.ownerConfirmed === false, 'conflict 场景不得置 ownerConfirmed')

    // 3. updated 场景：同值候选（新来源）→ 动作 updated → ownerConfirmed 置 true
    const updateRequest = await createGovernanceRequest(memoryWiki, {
      candidate: { userName: '叶健钦' },
      messageId: 'm-update',
      observationId: 'obs-update'
    })
    const updateResult = await memoryWiki.applyGovernanceUpgradeRequest(updateRequest.requestId)
    assert(updateResult.applyResult.action === 'updated', '同值新来源候选应产生 updated 动作')
    assert(updateResult.page.ownerConfirmed === true, 'updated 场景应置 ownerConfirmed true')

    console.log('verify-task447-owner-confirmed-conflict: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
