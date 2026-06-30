import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createObservationService } from '../electron/backend/observation/service.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { enqueueObservationWikiUpgradeCandidates } from '../electron/backend/observation/wikiUpgrade.js'

async function run() {
  const harness = await createServiceHarness('task381-observation-trait-upgrade-candidates')

  try {
    const baseDir = harness.baseDir
    const observationService = createObservationService(harness.store)
    const memoryWiki = await createMemoryWikiService({ baseDir, store: harness.store })

    const traitObservation = observationService.recordConversationTurn({
      date: '2026-06-30',
      userMessage: '我最近真的好累，压力很大，但还是会继续把项目往前推。',
      cornieMessage: '小铃湾听见啦。'
    })

    const result = await enqueueObservationWikiUpgradeCandidates(harness.store, {
      baseDir,
      observation: traitObservation,
      userMessage: '我最近真的好累，压力很大，但还是会继续把项目往前推。',
      messageId: 'obs-trait-1'
    })

    assert(result.created.some((item) => item.requestType === 'identity_trait_upgrade_candidate'), '高价值 trait 线索应生成 trait 升级候选')

    const requests = await memoryWiki.listGovernanceRequests({
      queueSection: 'wiki_upgrade_candidates'
    })
    const traitRequest = requests.find((item) => item.requestType === 'identity_trait_upgrade_candidate')
    assert(Boolean(traitRequest), '应存在 trait 升级候选')
    assert(traitRequest.evidence.some((item) => item.observationId === traitObservation.id), 'trait 升级候选应保留 observation 来源')

    const duplicate = await enqueueObservationWikiUpgradeCandidates(harness.store, {
      baseDir,
      observation: traitObservation,
      userMessage: '我最近真的好累，压力很大，但还是会继续把项目往前推。',
      messageId: 'obs-trait-1'
    })
    assert(!duplicate.created.some((item) => item.requestType === 'identity_trait_upgrade_candidate'), '同一 observation 不应重复生成 trait 升级候选')

    const lowValueObservation = observationService.recordConversationTurn({
      date: '2026-06-30',
      userMessage: '我中午买了瓶水，三块钱。',
      cornieMessage: '记住啦。'
    })

    const lowValue = await enqueueObservationWikiUpgradeCandidates(harness.store, {
      baseDir,
      observation: lowValueObservation,
      userMessage: '我中午买了瓶水，三块钱。',
      messageId: 'obs-trait-2'
    })
    assert(!lowValue.created.some((item) => item.requestType === 'identity_trait_upgrade_candidate'), '普通流水事实不应误生成 trait 升级候选')

    console.log('verify-task381-observation-trait-upgrade-candidates: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
