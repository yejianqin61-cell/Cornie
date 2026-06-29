import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createObservationService } from '../electron/backend/observation/service.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { enqueueObservationWikiUpgradeCandidates } from '../electron/backend/observation/wikiUpgrade.js'

async function run() {
  const harness = await createServiceHarness('task362-observation-wiki-upgrade-candidates')

  try {
    const baseDir = harness.baseDir
    const observationService = createObservationService(harness.store)
    const memoryWiki = await createMemoryWikiService({ baseDir, store: harness.store })

    const observation = observationService.recordConversationTurn({
      date: '2026-06-30',
      userMessage: '我叫叶健钦，我是你的爸爸，我的初恋名字叫钟奕菲。',
      cornieMessage: '小铃湾记住啦。'
    })

    assert(Boolean(observation?.id), '应先成功生成观察日志事实')

    const result = await enqueueObservationWikiUpgradeCandidates(harness.store, {
      baseDir,
      observation,
      userMessage: '我叫叶健钦，我是你的爸爸，我的初恋名字叫钟奕菲。',
      messageId: 'obs-upgrade-1'
    })

    assert(result.created.length >= 2, '高价值观察线索至少应产生主身份和重要人物升级候选')

    const requests = await memoryWiki.listGovernanceRequests({
      queueSection: 'wiki_upgrade_candidates'
    })

    const profileRequest = requests.find((item) => item.requestType === 'identity_profile_upgrade_candidate')
    const personRequest = requests.find((item) => item.requestType === 'identity_person_upgrade_candidate')

    assert(Boolean(profileRequest), '应存在主身份升级候选')
    assert(Boolean(personRequest), '应存在重要人物升级候选')
    assert(profileRequest.evidence.some((item) => item.observationId === observation.id), '主身份候选应保留观察日志来源')
    assert(personRequest.evidence.some((item) => item.observationId === observation.id), '重要人物候选应保留观察日志来源')

    const duplicate = await enqueueObservationWikiUpgradeCandidates(harness.store, {
      baseDir,
      observation,
      userMessage: '我叫叶健钦，我是你的爸爸，我的初恋名字叫钟奕菲。',
      messageId: 'obs-upgrade-1'
    })

    assert(duplicate.created.length === 0, '同一观察日志不应重复生成同类升级候选')

    const lowValueObservation = observationService.recordConversationTurn({
      date: '2026-06-30',
      userMessage: '我中午买了瓶水，三块钱。',
      cornieMessage: '帮你记住啦。'
    })

    const lowValue = await enqueueObservationWikiUpgradeCandidates(harness.store, {
      baseDir,
      observation: lowValueObservation,
      userMessage: '我中午买了瓶水，三块钱。',
      messageId: 'obs-upgrade-2'
    })

    assert(lowValue.created.length === 0, '普通流水事实不应被升级到长期记忆候选')

    console.log('verify-task362-observation-wiki-upgrade-candidates: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
