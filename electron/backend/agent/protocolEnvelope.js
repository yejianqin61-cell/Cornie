// 协议信封轮共享模块（BE-01）。
// 对话编排（orchestrator）与确认执行（confirm/executor）共用：
// - 信封请求（组装 messages → 调模型 → 解析候选 JSON → 修复重试 → telemetry）
// - trim / sum 工具
// - tool followup 拼接（"assistant 信封 JSON + user 追问"，支持只读补查上下文分支）
// 消除双份实现与漂移（此前 executor 版缺 lookupContexts 分支）。

import { buildJsonRepairPrompt, parseModelJson } from './jsonProtocol.js'
import {
  buildLookupFollowupPrompt,
  buildToolFollowupPrompt,
  estimateLegacyLookupFollowupPromptLength
} from './promptBuilder.js'
import { recordModelCallTelemetry } from './metrics.js'
import { chat } from '../model/deepseek/client.js'

export const MAX_PROTOCOL_REPAIR_RETRIES = 1

export function trimMessages(messages, maxHistory) {
  if (!Array.isArray(messages) || !Number.isFinite(maxHistory)) return messages
  if (messages.length <= maxHistory + 1) {
    return messages
  }
  return [messages[0], ...messages.slice(-maxHistory)]
}

export function sumPromptChars(messages) {
  return (Array.isArray(messages) ? messages : []).reduce(
    (total, item) => total + String(item?.content ?? '').length,
    0
  )
}

/**
 * 协议信封轮：调用模型并解析候选 JSON，解析失败时用修复 prompt 重试（MAX_PROTOCOL_REPAIR_RETRIES 次）。
 * @param {Array} messages 已组装的消息（调用方负责按历史上限 trim）
 * @param {object} telemetry 当前轮 telemetry（recordModelCallTelemetry 写入）
 * @param {object} [options]
 * @param {string} [options.phase='conversation'] 埋点阶段标识
 * @param {Function} [options.chatFn=chat] 模型调用注入（默认走 deepseek client；测试可注入 mock）
 * @param {number} [options.maxTokens=256] 信封轮 token 上限
 */
export async function requestProtocolEnvelope(
  messages,
  telemetry,
  { phase = 'conversation', chatFn = chat, maxTokens = 256 } = {}
) {
  let attempts = 0
  let workingMessages = messages

  while (attempts <= MAX_PROTOCOL_REPAIR_RETRIES) {
    const promptChars = sumPromptChars(workingMessages)
    const startedAt = Date.now()
    const response = await chatFn({ messages: workingMessages, maxTokens })
    recordModelCallTelemetry(telemetry, {
      phase,
      attempt: attempts + 1,
      promptChars,
      responseChars: String(response?.content ?? '').length,
      durationMs: Date.now() - startedAt
    })

    try {
      return parseModelJson(response.content)
    } catch (error) {
      if (attempts >= MAX_PROTOCOL_REPAIR_RETRIES) {
        error.rawResponse = response.content
        throw error
      }

      workingMessages = [
        ...workingMessages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: buildJsonRepairPrompt(response.content) }
      ]
      attempts += 1
    }
  }

  throw new Error('protocol envelope request failed unexpectedly')
}

/**
 * 工具轮 followup 拼接："assistant 信封 JSON + user 追问"。
 * lookupContexts 非空时使用只读补查分支（buildLookupFollowupPrompt + legacy 估算）。
 */
export function buildToolFollowupMessages(
  baseMessages,
  { assistantReply, toolResult, lookupContexts = [] },
  { maxHistory = null, phase = null } = {}
) {
  const hasLookup = Array.isArray(lookupContexts) && lookupContexts.length > 0
  const followupPrompt = hasLookup
    ? buildLookupFollowupPrompt({ assistantReply, toolResult, lookupContexts })
    : buildToolFollowupPrompt({ assistantReply, toolResult })

  const nextMessages = trimMessages(
    [
      ...baseMessages,
      {
        role: 'assistant',
        content: JSON.stringify({
          type: 'tool_call',
          assistant_reply: assistantReply,
          tool_calls: toolResult.results.map((item) => ({
            tool_name: item.tool_name,
            arguments: item.result ?? {}
          }))
        })
      },
      {
        role: 'user',
        content: followupPrompt
      }
    ],
    maxHistory
  )

  return {
    messages: nextMessages,
    promptMetrics: {
      phase: phase ?? (hasLookup ? 'lookup_followup' : 'tool_followup'),
      promptChars: followupPrompt.length,
      legacyPromptCharsEstimate: hasLookup
        ? estimateLegacyLookupFollowupPromptLength({ assistantReply, toolResult, lookupContexts })
        : followupPrompt.length
    }
  }
}
