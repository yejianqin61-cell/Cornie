import { randomUUID } from 'node:crypto'
import { getMessagesByDate, saveMessage } from '../../db.js'
import { buildJsonRepairPrompt, parseModelJson } from './jsonProtocol.js'
import { buildConversationContext } from './contextBuilder.js'
import { buildConversationPrompt, buildToolFollowupPrompt } from './promptBuilder.js'
import { evaluateToolCalls } from '../policy/toolPolicy.js'
import { chat } from '../model/deepseek/client.js'
import { executeToolCalls } from '../tools/gateway.js'

const MAX_HISTORY_MESSAGES = 40
const MAX_PROTOCOL_REPAIR_RETRIES = 1
const MAX_TOOL_ROUNDS = 1

function trimMessages(messages) {
  if (messages.length <= MAX_HISTORY_MESSAGES + 1) {
    return messages
  }
  return [messages[0], ...messages.slice(-MAX_HISTORY_MESSAGES)]
}

async function requestProtocolEnvelope(messages) {
  let attempts = 0
  let workingMessages = messages

  while (attempts <= MAX_PROTOCOL_REPAIR_RETRIES) {
    const response = await chat({ messages: workingMessages, maxTokens: 256 })

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

function buildProtocolFallbackReply() {
  return '唔……小铃湾这次没有把话说清楚，主人可以再说一遍吗？'
}

function buildBaseMessages(history, context) {
  return trimMessages([
    { role: 'system', content: buildConversationPrompt({ context }) },
    ...history.map((item) => ({
      role: item.role === 'cornie' ? 'assistant' : 'user',
      content: item.content
    }))
  ])
}

function buildToolFollowupMessages(baseMessages, assistantReply, toolResult) {
  return trimMessages([
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
      content: buildToolFollowupPrompt({ assistantReply, toolResult })
    }
  ])
}

export function createConversationOrchestrator(store) {
  return {
    async runTurn({ date, message }) {
      const userMessage = saveMessage(store, {
        id: randomUUID(),
        date,
        role: 'user',
        content: message
      })

      const history = getMessagesByDate(store, date)
      const context = buildConversationContext(store, { date })
      const baseMessages = buildBaseMessages(history, context)

      let finalReply = buildProtocolFallbackReply()
      let toolExecution = { used: false, results: [] }
      let policyDecision = { decision: 'allow' }

      try {
        const firstEnvelope = await requestProtocolEnvelope(baseMessages)

        if (firstEnvelope.type === 'tool_call') {
          if (MAX_TOOL_ROUNDS < 1) {
            finalReply = firstEnvelope.assistant_reply
          } else {
            policyDecision = evaluateToolCalls(firstEnvelope.tool_calls, {
              sourceText: firstEnvelope.assistant_reply
            })

            if (policyDecision.decision === 'allow') {
              const toolResult = await executeToolCalls(policyDecision.toolCalls, {
                date,
                store,
                source: 'conversation'
              })

              toolExecution = {
                used: true,
                results: toolResult.results
              }

              const followupMessages = buildToolFollowupMessages(
                baseMessages,
                firstEnvelope.assistant_reply,
                toolResult
              )
              const secondEnvelope = await requestProtocolEnvelope(followupMessages)
              finalReply =
                secondEnvelope.type === 'reply'
                  ? secondEnvelope.assistant_reply
                  : firstEnvelope.assistant_reply
            } else if (policyDecision.decision === 'confirm') {
              finalReply = `${firstEnvelope.assistant_reply}\n\n${policyDecision.confirmRequest.reason}`
            } else if (policyDecision.decision === 'ask_back') {
              finalReply = policyDecision.question
            } else {
              finalReply = `${firstEnvelope.assistant_reply}\n\n${policyDecision.reason}`
            }
          }
        } else {
          finalReply = firstEnvelope.assistant_reply
        }
      } catch (error) {
        console.error('Conversation orchestrator error:', error)
      }

      const cornieMessage = saveMessage(store, {
        id: randomUUID(),
        date,
        role: 'cornie',
        content: finalReply
      })

      return {
        userMessage,
        cornieMessage,
        toolExecution,
        policyDecision
      }
    }
  }
}
