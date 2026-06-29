export const OBSERVATION_PROMPT_POLICY = Object.freeze({
  conversationTodaySummaryLimit: 5,
  wikiRecallTodayLimit: 3,
  diaryTodayDetailLimit: 20,
  historyListDefaultLimit: 50,
  todayArchiveDefaultLimit: 200
})

export function getObservationPromptPolicy() {
  return {
    archiveMode: 'by_day',
    historyInjection: 'on_demand_only',
    conversationTodaySummaryLimit: OBSERVATION_PROMPT_POLICY.conversationTodaySummaryLimit,
    wikiRecallTodayLimit: OBSERVATION_PROMPT_POLICY.wikiRecallTodayLimit,
    diaryTodayDetailLimit: OBSERVATION_PROMPT_POLICY.diaryTodayDetailLimit,
    historyListDefaultLimit: OBSERVATION_PROMPT_POLICY.historyListDefaultLimit,
    todayArchiveDefaultLimit: OBSERVATION_PROMPT_POLICY.todayArchiveDefaultLimit
  }
}

export function buildObservationPromptPolicySummary() {
  return [
    '观察日志按自然日归档保存，不会每天清空。',
    `聊天 prompt 默认只读取当天观察摘要（最多 ${OBSERVATION_PROMPT_POLICY.conversationTodaySummaryLimit} 条）。`,
    `Wiki 补查默认只读取当天观察补充（最多 ${OBSERVATION_PROMPT_POLICY.wikiRecallTodayLimit} 条）。`,
    `Cornie 日记生成会读取当天较完整的观察事实（最多 ${OBSERVATION_PROMPT_POLICY.diaryTodayDetailLimit} 条）。`,
    '历史观察日志不会默认全量注入模型，只能按日期、主题或关键词按需补查。'
  ].join('\n')
}
