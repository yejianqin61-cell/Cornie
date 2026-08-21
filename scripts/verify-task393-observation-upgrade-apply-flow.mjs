import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createObservationService } from '../electron/backend/observation/service.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

// 446：正则 extract 入队已随 wikiUpgrade.js 删除；
// 治理候选改由记忆提炼轮次（memoryDistillation）直接构造。
// 本脚本改为"直接构造治理请求 → 人类审批应用"链路，验证 apply 流程不回归。

async function createAndApply(memoryWiki, observationService, harness, { userMessage, messageId, expectedType, candidate, observationInput }) {
  const observation = observationService.addNoteSmart({
    date: '2026-06-30',
    type: 'event',
    title: observationInput.title,
    content: observationInput.content,
    sourceText: userMessage
  }).note

  const request = await memoryWiki.createGovernanceRequest({
    requestType: expectedType,
    triggerSource: 'memory_distillation',
    queueSection: 'wiki_upgrade_candidates',
    riskLevel: expectedType === 'identity_preference_upgrade_candidate' ? 'medium' : 'high',
    title: candidate.userName || candidate.title || candidate.personName || '升级候选',
    reason: '验证 apply 链路：LLM 提炼提议的身份候选进入治理审核。',
    evidence: [
      {
        observationId: observation.id,
        date: observation.date,
        type: observation.type,
        title: observation.title,
        content: observation.content,
        messageId,
        sourceText: userMessage
      },
      { candidateType: expectedType, candidate }
    ],
    payload: { action: `upgrade_${expectedType.replace('_upgrade_candidate', '')}_from_observation`, candidate }
  })

  const applyResult = await memoryWiki.applyGovernanceUpgradeRequest(request.requestId)
  assert(applyResult.request.status === 'approved', `${expectedType} 应用后状态应变为 approved`)
  assert(applyResult.page.ownerConfirmed === true, `${expectedType} 应用后页面应 owner confirmed`)
  assert(
    Array.isArray(applyResult.page.sourceRefs) &&
      applyResult.page.sourceRefs.some((item) => item.kind === 'observation' && item.observationId === observation.id),
    `${expectedType} 应保留 observation 来源引用`
  )

  return applyResult
}

async function run() {
  const harness = await createServiceHarness('task393-observation-upgrade-apply-flow')

  try {
    const observationService = createObservationService(harness.store)
    const memoryWiki = await createMemoryWikiService({
      baseDir: harness.baseDir,
      store: harness.store
    })

    const profileResult = await createAndApply(memoryWiki, observationService, harness, {
      userMessage: '我叫叶健钦，我是你的爸爸，也是你的创造者。',
      messageId: 'task393-profile',
      expectedType: 'identity_profile_upgrade_candidate',
      candidate: { userName: '叶健钦', cornieRelationship: '用户是 Cornie 的创造者，也能算是 Cornie 的爸爸' },
      observationInput: { title: '主人介绍了自己', content: '主人叫叶健钦，是铃湾的创造者。' }
    })
    assert(profileResult.page.pageType === 'identity_profile', 'profile 候选应落到 identity_profile')
    assert(profileResult.page.userName === '叶健钦', 'profile 页面应写入用户名字')

    const preferenceResult = await createAndApply(memoryWiki, observationService, harness, {
      userMessage: '我不喜欢太甜的奶茶。',
      messageId: 'task393-preference',
      expectedType: 'identity_preference_upgrade_candidate',
      candidate: { title: '奶茶', stance: '不喜欢', preferenceType: '饮食' },
      observationInput: { title: '主人的奶茶口味', content: '主人不喜欢太甜的奶茶。' }
    })
    assert(preferenceResult.page.pageType === 'identity_preference', 'preference 候选应落到 identity_preference')

    const traitResult = await createAndApply(memoryWiki, observationService, harness, {
      userMessage: '我最近真的好累，压力很大，但还是会继续把项目往前推。',
      messageId: 'task393-trait',
      expectedType: 'identity_trait_upgrade_candidate',
      candidate: { title: '高压下容易疲惫', traitType: '压力反应', traitSummary: '用户在高压阶段容易感到疲惫，但仍倾向继续扛着事情往前走。' },
      observationInput: { title: '主人的压力状态', content: '主人近期压力大但仍在坚持推进项目。' }
    })
    assert(traitResult.page.pageType === 'identity_trait', 'trait 候选应落到 identity_trait')
    assert(traitResult.page.status === 'active', 'trait 正式应用后应提升为 active')

    const personResult = await createAndApply(memoryWiki, observationService, harness, {
      userMessage: '我的初恋名字叫钟奕菲，她很温柔，也一直是我前进的动力。',
      messageId: 'task393-person',
      expectedType: 'identity_person_upgrade_candidate',
      candidate: { personName: '钟奕菲', relationshipToUser: '初恋' },
      observationInput: { title: '重要人物钟奕菲', content: '钟奕菲是主人的初恋，温柔且是主人前进的动力。' }
    })
    assert(personResult.page.pageType === 'identity_person', 'person 候选应落到 identity_person')
    assert(personResult.page.personName === '钟奕菲', 'person 页面应写入人物名')

    console.log('verify-task393-observation-upgrade-apply-flow: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
