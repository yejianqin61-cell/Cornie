import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createObservationService } from '../electron/backend/observation/service.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { enqueueObservationWikiUpgradeCandidates } from '../electron/backend/observation/wikiUpgrade.js'

async function createAndApply(memoryWiki, observationService, harness, { userMessage, messageId, expectedType }) {
  const observation = observationService.recordConversationTurn({
    date: '2026-06-30',
    userMessage,
    cornieMessage: '小铃湾记下来啦。'
  })

  const enqueueResult = await enqueueObservationWikiUpgradeCandidates(harness.store, {
    baseDir: harness.baseDir,
    observation,
    userMessage,
    messageId
  })

  const request = enqueueResult.created.find((item) => item.requestType === expectedType)
  assert(Boolean(request), `应生成 ${expectedType} 请求`)

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
      expectedType: 'identity_profile_upgrade_candidate'
    })
    assert(profileResult.page.pageType === 'identity_profile', 'profile 候选应落到 identity_profile')
    assert(profileResult.page.userName === '叶健钦', 'profile 页面应写入用户名字')

    const preferenceResult = await createAndApply(memoryWiki, observationService, harness, {
      userMessage: '我不喜欢太甜的奶茶。',
      messageId: 'task393-preference',
      expectedType: 'identity_preference_upgrade_candidate'
    })
    assert(preferenceResult.page.pageType === 'identity_preference', 'preference 候选应落到 identity_preference')

    const traitResult = await createAndApply(memoryWiki, observationService, harness, {
      userMessage: '我最近真的好累，压力很大，但还是会继续把项目往前推。',
      messageId: 'task393-trait',
      expectedType: 'identity_trait_upgrade_candidate'
    })
    assert(traitResult.page.pageType === 'identity_trait', 'trait 候选应落到 identity_trait')
    assert(traitResult.page.status === 'active', 'trait 正式应用后应提升为 active')

    const personResult = await createAndApply(memoryWiki, observationService, harness, {
      userMessage: '我的初恋名字叫钟奕菲，她很温柔，也一直是我前进的动力。',
      messageId: 'task393-person',
      expectedType: 'identity_person_upgrade_candidate'
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
