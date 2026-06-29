import {
  buildCategoryLookupFollowupRules,
  buildCategoryMappingProtocol
} from './prompts/categoryMappingPrompt.js'

const CORNIE_PERSONA = `你是 Cornie（铃湾），一只只有一只角的小山羊，正趴在主人的电脑屏幕右下角。
你的性格温柔、童真、带一点调皮。
你称呼用户为"主人"。
你自称"铃湾"或"小铃湾"，不要自称"湾湾"。
你说话像一个小女孩，但偶尔会冒出一些有哲理的话。
你的回答通常很短（1-3句话），像朋友聊天一样自然。
你脖子上挂着一个铃铛，尾巴是一小截水波。
你每天结束时会把和主人的对话记成日记，那是你眼中的今天。`

const JSON_PROTOCOL = `你必须严格使用 JSON 协议回复，只能输出一个 JSON 对象，不要输出其他文字、解释或 Markdown。

如果只需要正常回复，输出：
{"type":"reply","assistant_reply":"你的回复"}

如果需要调用工具，输出：
{"type":"tool_call","assistant_reply":"你对主人说的话","tool_calls":[{"tool_name":"tool.name","arguments":{}}]}

如果你不确定是否需要工具，优先使用 reply。`

const CATEGORY_MAPPING_PROTOCOL = buildCategoryMappingProtocol()

function buildContextSection(context) {
  const loadPolicyBlock = context.loadPolicy
    ? [
        '上下文装载边界：',
        `- 默认注入层：${(context.loadPolicy.defaultInjectedLayers || []).join(', ') || '无'}`,
        `- 仅补查层：${(context.loadPolicy.recallOnlyLayers || []).join(', ') || '无'}`,
        `- 预算：${JSON.stringify(context.loadPolicy.budgets || {})}`
      ].join('\n')
    : ''

  return [
    `今天日期：${context.date}`,
    loadPolicyBlock,
    `最近对话摘要：\n${context.recentConversationSummary}`,
    `类目摘要：\n${context.categorySummary}`,
    `待办摘要：\n${context.todoSummary}`,
    `日程摘要：\n${context.scheduleSummary}`,
    `观察日志摘要：\n${context.observationSummary}`,
    `长期记忆摘要：\n${context.memorySummary}`,
    `主题索引摘要：\n${context.topicSummary}`,
    `历史聊天命中摘要：\n${context.chatRecallSummary}`,
    `观察补查摘要：\n${context.observationRecallSummary}`,
    `可用工具摘要：\n${context.toolSummary}`
  ].filter(Boolean).join('\n\n')
}

function summarizeLookupToolResult(toolResult) {
  const results = Array.isArray(toolResult?.results) ? toolResult.results : []
  return results.map((item) => ({
    tool_name: item?.tool_name ?? null,
    ok: item?.ok !== false,
    query: item?.result?.query ?? null,
    total: Number.isFinite(item?.result?.total) ? item.result.total : 0,
    hitSource: item?.result?.hitSource ?? null,
    topNames: Array.isArray(item?.result?.items)
      ? item.result.items.map((candidate) => candidate?.name).filter(Boolean).slice(0, 5)
      : []
  }))
}

export function buildConversationPrompt({ context }) {
  return [CORNIE_PERSONA, JSON_PROTOCOL, CATEGORY_MAPPING_PROTOCOL, buildContextSection(context)].join('\n\n')
}

export function buildToolFollowupPrompt({ assistantReply, toolResult }) {
  return [
    '你已经完成了一轮工具调用。',
    '请结合工具执行结果，输出最终给主人的回复。',
    '如果工具已经成功写入，就明确告诉主人实际写入了什么。',
    '如果工具没有成功写入，就明确说明没有写入，以及原因是什么。',
    '仍然只能输出一个合法 JSON 对象，并且此轮只能输出 reply。',
    `你上一轮对主人说的话：${assistantReply}`,
    `工具执行结果：${JSON.stringify(toolResult)}`
  ].join('\n')
}

export function buildLookupFollowupPrompt({ assistantReply, toolResult, lookupContexts }) {
  return [
    '你刚刚完成的是一轮只读补查，不是最终写入。',
    buildCategoryLookupFollowupRules(),
    '仍然只能输出一个合法 JSON 对象；如果需要继续动作，可以输出 tool_call；如果信息仍不足，输出 reply。',
    `你上一轮对主人说的话：${assistantReply}`,
    `只读补查摘要：${JSON.stringify(lookupContexts)}`,
    `补查工具结果摘要：${JSON.stringify(summarizeLookupToolResult(toolResult))}`
  ].join('\n')
}

export function estimateLegacyLookupFollowupPromptLength({ assistantReply, toolResult, lookupContexts }) {
  return [
    '你刚刚完成的是一轮只读补查，不是最终写入。',
    buildCategoryLookupFollowupRules(),
    '仍然只能输出一个合法 JSON 对象；如果需要继续动作，可以输出 tool_call；如果信息仍不足，输出 reply。',
    `你上一轮对主人说的话：${assistantReply}`,
    `只读补查摘要：${JSON.stringify(lookupContexts)}`,
    `原始工具结果：${JSON.stringify(toolResult)}`
  ].join('\n').length
}
