import { OBSERVATION_PROMPT_POLICY } from '../observation/policy.js'

export const PROMPT_LOADING_POLICY = Object.freeze({
  liveConversationHistoryLimit: 40,
  recentConversationSummaryMessages: 8,
  todoSummaryItems: 5,
  scheduleSummaryItems: 5,
  observationSummaryItems: OBSERVATION_PROMPT_POLICY.conversationTodaySummaryLimit,
  memoryPageLimit: 4,
  topicLimit: 4,
  chatRecallDateLimit: 3,
  observationRecallLimit: OBSERVATION_PROMPT_POLICY.wikiRecallTodayLimit,
  diaryObservationDetailLimit: OBSERVATION_PROMPT_POLICY.diaryTodayDetailLimit
})

export function getPromptLoadingPolicy() {
  return {
    ...PROMPT_LOADING_POLICY,
    observation: { ...OBSERVATION_PROMPT_POLICY }
  }
}

export function buildPromptLoadingPolicySummary() {
  return {
    injectedLayers: {
      liveConversationHistoryLimit: PROMPT_LOADING_POLICY.liveConversationHistoryLimit,
      recentConversationSummaryMessages: PROMPT_LOADING_POLICY.recentConversationSummaryMessages,
      todoSummaryItems: PROMPT_LOADING_POLICY.todoSummaryItems,
      scheduleSummaryItems: PROMPT_LOADING_POLICY.scheduleSummaryItems,
      observationSummaryItems: PROMPT_LOADING_POLICY.observationSummaryItems,
      memoryPageLimit: PROMPT_LOADING_POLICY.memoryPageLimit,
      topicLimit: PROMPT_LOADING_POLICY.topicLimit
    },
    recallLayers: {
      chatRecallDateLimit: PROMPT_LOADING_POLICY.chatRecallDateLimit,
      observationRecallLimit: PROMPT_LOADING_POLICY.observationRecallLimit
    },
    diaryLayers: {
      observationDetailLimit: PROMPT_LOADING_POLICY.diaryObservationDetailLimit
    }
  }
}
