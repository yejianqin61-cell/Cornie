import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createObservationService } from '../electron/backend/observation/service.js'
import { OBSERVATION_PROMPT_POLICY, getObservationPromptPolicy, buildObservationPromptPolicySummary } from '../electron/backend/observation/policy.js'

function addSeedObservations(observation, date, count) {
  for (let index = 0; index < count; index += 1) {
    observation.addNote({
      date,
      type: 'event',
      title: `观察 ${index + 1}`,
      content: `这是第 ${index + 1} 条观察日志内容`
    })
  }
}

async function run() {
  const harness = await createServiceHarness('task351-observation-policy-boundaries')
  const observation = createObservationService(harness.store)
  const date = '2026-06-30'

  addSeedObservations(observation, date, 30)

  const todayConversation = observation.listTodayForConversation(date)
  const todayWikiRecall = observation.listTodayForWikiRecall(date)
  const todayDiary = observation.listTodayForDiary(date)
  const todayArchive = observation.listByDate(date)

  assert(todayConversation.length === OBSERVATION_PROMPT_POLICY.conversationTodaySummaryLimit, '聊天入口应遵循 conversationTodaySummaryLimit')
  assert(todayWikiRecall.length === OBSERVATION_PROMPT_POLICY.wikiRecallTodayLimit, 'wiki recall 应遵循 wikiRecallTodayLimit')
  assert(todayDiary.length === OBSERVATION_PROMPT_POLICY.diaryTodayDetailLimit, '日记入口应遵循 diaryTodayDetailLimit')
  assert(todayArchive.length === 30, '按日归档读取应保留较完整事实档案')

  const policy = getObservationPromptPolicy()
  assert(policy.archiveMode === 'by_day', 'policy 应声明按天归档')
  assert(policy.historyInjection === 'on_demand_only', 'policy 应声明历史观察仅按需补查')

  const summary = buildObservationPromptPolicySummary()
  assert(summary.includes('不会每天清空'), 'policy summary 应说明不会每天清空')
  assert(summary.includes('不会默认全量注入模型'), 'policy summary 应说明历史观察不会默认全量注入')

  const servicePolicy = observation.getPromptPolicy()
  assert(servicePolicy.diaryTodayDetailLimit === OBSERVATION_PROMPT_POLICY.diaryTodayDetailLimit, 'service policy 应与常量一致')

  await harness.close()
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
