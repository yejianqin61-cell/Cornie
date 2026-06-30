import { randomUUID } from 'node:crypto'
import { getMessagesByDate, saveMessage } from '../../db.js'
import { buildJsonRepairPrompt, parseModelJson } from './jsonProtocol.js'
import { buildConversationContext } from './contextBuilder.js'
import {
  buildConversationPrompt,
  buildLookupFollowupPrompt,
  buildToolFollowupPrompt
} from './promptBuilder.js'
import { estimateLegacyLookupFollowupPromptLength } from './promptBuilder.js'
import { evaluateToolCalls } from '../policy/toolPolicy.js'
import { chat } from '../model/deepseek/client.js'
import { executeToolCalls } from '../tools/gateway.js'
import { createObservationService } from '../observation/service.js'
import { enqueueObservationWikiUpgradeCandidates } from '../observation/wikiUpgrade.js'
import { createConfirmService } from '../confirm/service.js'
import { upsertIdentityProfileFromConversation } from '../identity/profileUpsert.js'
import { upsertIdentityPreferenceFromConversation } from '../identity/preferenceUpsert.js'
import { upsertIdentityTraitFromConversation } from '../identity/traitUpsert.js'
import { upsertIdentityPersonFromConversation } from '../identity/personUpsert.js'
import {
  attachContextTelemetry,
  captureInitialPromptTelemetry,
  createTurnTelemetry,
  finalizeTurnTelemetry,
  recordFollowupPromptTelemetry,
  recordModelCallTelemetry,
  recordToolRoundTelemetry
} from './metrics.js'
import {
  canExecuteReadOnlyLookupRound,
  cacheReadOnlyLookupResult,
  createToolRoundState,
  getCachedReadOnlyLookupResult,
  isReadOnlyLookupRound,
  recordToolRoundState
} from './toolRoundState.js'
import { logCategoryAudit } from '../category/audit.js'
import { PROMPT_LOADING_POLICY } from './promptLoadingPolicy.js'

const MAX_HISTORY_MESSAGES = PROMPT_LOADING_POLICY.liveConversationHistoryLimit
const MAX_PROTOCOL_REPAIR_RETRIES = 1
const MAX_TOOL_ROUNDS = 2

function trimMessages(messages) {
  if (messages.length <= MAX_HISTORY_MESSAGES + 1) {
    return messages
  }
  return [messages[0], ...messages.slice(-MAX_HISTORY_MESSAGES)]
}

function sumPromptChars(messages) {
  return messages.reduce((total, item) => total + String(item?.content ?? '').length, 0)
}

async function requestProtocolEnvelope(messages, telemetry, phase = 'conversation') {
  let attempts = 0
  let workingMessages = messages

  while (attempts <= MAX_PROTOCOL_REPAIR_RETRIES) {
    const promptChars = sumPromptChars(workingMessages)
    const startedAt = Date.now()
    const response = await chat({ messages: workingMessages, maxTokens: 256 })
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

function appendToolRoundMessages(messages, assistantReply, toolResult, options = {}) {
  const followupPrompt =
    Array.isArray(options.lookupContexts) && options.lookupContexts.length > 0
      ? buildLookupFollowupPrompt({
          assistantReply,
          toolResult,
          lookupContexts: options.lookupContexts
        })
      : buildToolFollowupPrompt({ assistantReply, toolResult })

  const nextMessages = trimMessages([
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
      content: followupPrompt
    }
  ])

  return {
    messages: nextMessages,
    promptMetrics: {
      phase:
        Array.isArray(options.lookupContexts) && options.lookupContexts.length > 0
          ? 'lookup_followup'
          : 'tool_followup',
      promptChars: followupPrompt.length,
      legacyPromptCharsEstimate:
        Array.isArray(options.lookupContexts) && options.lookupContexts.length > 0
          ? estimateLegacyLookupFollowupPromptLength({
              assistantReply,
              toolResult,
              lookupContexts: options.lookupContexts
            })
          : followupPrompt.length
    }
  }
}

function logLookupAudit(message, lookupContexts) {
  for (const lookup of lookupContexts) {
    const lookupReasonParts = [
      lookup.hitSource === 'cache'
        ? `命中补查缓存：${lookup.domain}/${lookup.lookupType}`
        : `触发只读补查：${lookup.domain}/${lookup.lookupType}`
    ]
    if (lookup.categoryType) {
      lookupReasonParts.push(`type=${lookup.categoryType}`)
    }
    if (lookup.normalizedQuery) {
      lookupReasonParts.push(`query=${lookup.normalizedQuery}`)
    }
    lookupReasonParts.push(`返回 ${lookup.total} 条结果`)

    logCategoryAudit({
      eventType: 'category_mapping_resolved',
      domain: lookup.domain,
      toolName: lookup.toolName,
      sourceText: message,
      similarCandidates: Array.isArray(lookup.items)
        ? lookup.items.map((item) => item.name).filter(Boolean).slice(0, 5)
        : [],
      decision: 'mapped',
      reason: lookupReasonParts.join('，')
    })
  }
}

export function createConversationOrchestrator(store, { baseDir = process.cwd() } = {}) {
  const observation = createObservationService(store)
  const confirm = createConfirmService(store)

  return {
    async runTurn({ date, message }) {
      const telemetry = createTurnTelemetry({
        source: 'conversation',
        date,
        message
      })
      const userMessage = saveMessage(store, {
        id: randomUUID(),
        date,
        role: 'user',
        content: message
      })

      const history = getMessagesByDate(store, date)
      const context = await buildConversationContext(store, { date, baseDir })
      const baseMessages = buildBaseMessages(history, context)
      attachContextTelemetry(telemetry, context)
      captureInitialPromptTelemetry(telemetry, baseMessages)

      let finalReply = buildProtocolFallbackReply()
      let toolExecution = { used: false, results: [] }
      let policyDecision = { decision: 'allow' }
      let pendingConfirmation = null
      let requestedToolCalls = []
      let initialAssistantReply = ''
      const toolRoundState = createToolRoundState()

      try {
        const firstEnvelope = await requestProtocolEnvelope(baseMessages, telemetry, 'conversation_initial')

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
                sourceText: currentEnvelope.assistant_reply,
                store
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

              const isLookupOnlyRound = isReadOnlyLookupRound(policyDecision.toolCalls)

              if (isLookupOnlyRound && !canExecuteReadOnlyLookupRound(toolRoundState, policyDecision.toolCalls)) {
                logCategoryAudit({
                  eventType: 'category_mapping_ask_back',
                  toolName: policyDecision.toolCalls[0]?.tool_name ?? null,
                  sourceText: message,
                  decision: 'ask_back',
                  reason: '当前业务域的只读补查轮次已用尽，停止继续补查'
                })
                finalReply = '小铃湾在这个类目上已经补查过一次了，但还是没法稳稳判断。主人可以再告诉我更具体一点吗？'
                break
              }

              let toolResult
              let toolDurationMs = 0
              if (isLookupOnlyRound) {
                const cachedResults = policyDecision.toolCalls.map((toolCall) =>
                  getCachedReadOnlyLookupResult(toolRoundState, toolCall)
                )

                if (cachedResults.every(Boolean)) {
                  toolResult = {
                    type: 'tool_result',
                    results: cachedResults
                  }
                }
              }

              if (!toolResult) {
                const toolStartedAt = Date.now()
                toolResult = await executeToolCalls(policyDecision.toolCalls, {
                  date,
                  store,
                  source: 'conversation'
                })
                toolDurationMs = Date.now() - toolStartedAt

                if (isLookupOnlyRound) {
                  policyDecision.toolCalls.forEach((toolCall, index) => {
                    cacheReadOnlyLookupResult(toolRoundState, toolCall, toolResult.results[index])
                  })
                }
              }

              toolExecution = {
                used: true,
                results: [...toolExecution.results, ...toolResult.results]
              }

              recordToolRoundState(toolRoundState, toolResult)
              recordToolRoundTelemetry(telemetry, {
                round: round + 1,
                isLookupOnly: isLookupOnlyRound,
                toolCalls: policyDecision.toolCalls,
                lookupContexts: toolRoundState.lastReadOnlyLookups,
                durationMs: toolDurationMs
              })

              if (toolRoundState.lastReadOnlyLookups.length > 0) {
                logLookupAudit(message, toolRoundState.lastReadOnlyLookups)
              }

              const nextMessages = appendToolRoundMessages(
                currentMessages,
                currentEnvelope.assistant_reply,
                toolResult,
                {
                  lookupContexts: toolRoundState.lastReadOnlyLookups
                }
              )
              currentMessages = nextMessages.messages
              recordFollowupPromptTelemetry(telemetry, nextMessages.promptMetrics)

              const nextEnvelope = await requestProtocolEnvelope(
                currentMessages,
                telemetry,
                isLookupOnlyRound ? 'conversation_lookup_followup' : 'conversation_tool_followup'
              )
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

      let observationRecord = null
      try {
        observationRecord = observation.recordConversationTurn({
          date,
          userMessage: message,
          cornieMessage: finalReply
        })
      } catch (error) {
        console.error('Observation write error:', error)
      }

      try {
        if (observationRecord) {
          await enqueueObservationWikiUpgradeCandidates(store, {
            baseDir,
            observation: observationRecord,
            userMessage: message,
            messageId: userMessage.id
          })
        }
      } catch (error) {
        console.error('Observation wiki upgrade candidate error:', error)
      }

      try {
        const identityWrite = await upsertIdentityProfileFromConversation(store, {
          baseDir,
          date,
          messageId: userMessage.id,
          userMessage: message
        })

        if (identityWrite?.action === 'conflict') {
          console.warn('Identity profile conflict detected:', identityWrite.conflicts)
        }
      } catch (error) {
        console.error('Identity profile upsert error:', error)
      }

      try {
        await upsertIdentityPreferenceFromConversation(store, {
          baseDir,
          date,
          messageId: userMessage.id,
          userMessage: message
        })
      } catch (error) {
        console.error('Identity preference upsert error:', error)
      }

      try {
        await upsertIdentityTraitFromConversation(store, {
          baseDir,
          date,
          messageId: userMessage.id,
          userMessage: message
        })
      } catch (error) {
        console.error('Identity trait upsert error:', error)
      }

      try {
        await upsertIdentityPersonFromConversation(store, {
          baseDir,
          date,
          messageId: userMessage.id,
          userMessage: message,
          observation: observationRecord
        })
      } catch (error) {
        console.error('Identity person upsert error:', error)
      }

      return {
        userMessage,
        cornieMessage,
        toolExecution,
        policyDecision,
        pendingConfirmation,
        telemetry: finalizeTurnTelemetry(telemetry, {
          policyDecision: policyDecision.decision,
          pendingConfirmation: Boolean(pendingConfirmation),
          toolExecutionUsed: toolExecution.used,
          finalReply
        })
      }
    }
  }
}
