import { randomUUID } from 'node:crypto'
import { getMessagesByDate, saveMessage } from '../../db.js'
import { buildJsonRepairPrompt, parseModelJson } from './jsonProtocol.js'
import { buildConversationContext } from './contextBuilder.js'
import { buildConversationPrompt, buildToolFollowupPrompt } from './promptBuilder.js'
import { evaluateToolCalls } from '../policy/toolPolicy.js'
import { chat } from '../model/deepseek/client.js'
import { executeToolCalls } from '../tools/gateway.js'
import { createObservationService } from '../observation/service.js'
import { createMemoryService } from '../memory/service.js'
import { createConfirmService } from '../confirm/service.js'

const MAX_HISTORY_MESSAGES = 40
const MAX_PROTOCOL_REPAIR_RETRIES = 1
const MAX_TOOL_ROUNDS = 2

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
  return '唔……小铃湾这次没有把话说明白，主人可以再说一遍吗？'
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

function appendToolRoundMessages(messages, assistantReply, toolResult) {
  return trimMessages([
    ...messages,
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
  const observation = createObservationService(store)
  const memory = createMemoryService(store)
  const confirm = createConfirmService(store)

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
      let pendingConfirmation = null
      let requestedToolCalls = []
      let initialAssistantReply = ''

      try {
        const firstEnvelope = await requestProtocolEnvelope(baseMessages)

        if (firstEnvelope.type === 'tool_call') {
          requestedToolCalls = Array.isArray(firstEnvelope.tool_calls) ? firstEnvelope.tool_calls : []
          initialAssistantReply = firstEnvelope.assistant_reply

          if (MAX_TOOL_ROUNDS < 1) {
            finalReply = firstEnvelope.assistant_reply
          } else {
            let currentEnvelope = firstEnvelope
            let currentMessages = baseMessages

            for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
              policyDecision = evaluateToolCalls(currentEnvelope.tool_calls, {
                sourceText: currentEnvelope.assistant_reply
              })

              if (policyDecision.decision === 'confirm') {
                requestedToolCalls = currentEnvelope.tool_calls
                finalReply = `${currentEnvelope.assistant_reply}\n\n${policyDecision.confirmRequest.reason}`
                break
              }

              if (policyDecision.decision === 'ask_back') {
                finalReply = policyDecision.question
                break
              }

              if (policyDecision.decision === 'deny') {
                finalReply = `${currentEnvelope.assistant_reply}\n\n${policyDecision.reason}`
                break
              }

              const toolResult = await executeToolCalls(policyDecision.toolCalls, {
                date,
                store,
                source: 'conversation'
              })

              toolExecution = {
                used: true,
                results: [...toolExecution.results, ...toolResult.results]
              }

              currentMessages = appendToolRoundMessages(
                currentMessages,
                currentEnvelope.assistant_reply,
                toolResult
              )

              const nextEnvelope = await requestProtocolEnvelope(currentMessages)
              if (nextEnvelope.type === 'reply') {
                finalReply = nextEnvelope.assistant_reply
                break
              }

              currentEnvelope = nextEnvelope
              requestedToolCalls = nextEnvelope.tool_calls

              if (round === MAX_TOOL_ROUNDS - 1) {
                finalReply = currentEnvelope.assistant_reply
              }
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

      if (policyDecision.decision === 'confirm' && requestedToolCalls.length > 0) {
        try {
          pendingConfirmation = confirm.createPending({
            date,
            conversationMessageId: cornieMessage.id,
            sourceText: message,
            assistantReply: initialAssistantReply || finalReply,
            toolCalls: requestedToolCalls,
            confirmRequest: policyDecision.confirmRequest
          })
        } catch (error) {
          console.error('Pending confirmation create error:', error)
        }
      }

      try {
        observation.recordConversationTurn({
          date,
          userMessage: message,
          cornieMessage: finalReply
        })
        const memoryEntry = memory.deriveFromConversation({
          date,
          userMessage: message,
          cornieMessage: finalReply
        })
        if (memoryEntry) {
          memory.create(memoryEntry)
        }
      } catch (error) {
        console.error('Observation/memory write error:', error)
      }

      return {
        userMessage,
        cornieMessage,
        toolExecution,
        policyDecision,
        pendingConfirmation
      }
    }
  }
}
