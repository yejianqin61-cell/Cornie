import { assert } from '../tests/shared/service-harness.mjs'
import { PROMPT_LOADING_POLICY, getPromptLoadingPolicy, buildPromptLoadingPolicySummary } from '../electron/backend/agent/promptLoadingPolicy.js'
import { CONVERSATION_CONTEXT_BUDGETS } from '../electron/backend/agent/contextBuilder.js'
import { OBSERVATION_PROMPT_POLICY } from '../electron/backend/observation/policy.js'

function run() {
  const policy = getPromptLoadingPolicy()
  const summary = buildPromptLoadingPolicySummary()

  assert(PROMPT_LOADING_POLICY.liveConversationHistoryLimit === 40, '主链 history 上限应统一为 40')
  assert(PROMPT_LOADING_POLICY.recentConversationSummaryMessages === 8, '最近对话摘要上限应统一为 8')
  assert(PROMPT_LOADING_POLICY.observationSummaryItems === 5, '当日观察摘要上限应统一为 5')
  assert(PROMPT_LOADING_POLICY.observationRecallLimit === 3, '观察补查上限应统一为 3')
  assert(PROMPT_LOADING_POLICY.diaryObservationDetailLimit === 20, '日记观察素材上限应统一为 20')

  assert(CONVERSATION_CONTEXT_BUDGETS.recentConversationMessages === PROMPT_LOADING_POLICY.recentConversationSummaryMessages, 'contextBuilder 应消费统一最近对话摘要策略')
  assert(CONVERSATION_CONTEXT_BUDGETS.observationSummaryItems === OBSERVATION_PROMPT_POLICY.conversationTodaySummaryLimit, 'contextBuilder 观察摘要上限应与 observation policy 对齐')
  assert(policy.observation.diaryTodayDetailLimit === PROMPT_LOADING_POLICY.diaryObservationDetailLimit, '统一策略应暴露 observation diary 上限')
  assert(summary.injectedLayers.liveConversationHistoryLimit === 40, 'policy summary 应暴露 history 上限')
  assert(summary.recallLayers.chatRecallDateLimit === 3, 'policy summary 应暴露 chat recall 上限')
  assert(summary.diaryLayers.observationDetailLimit === 20, 'policy summary 应暴露 diary 素材上限')

  console.log('verify-task371-prompt-loading-policy: ok')
}

run()
