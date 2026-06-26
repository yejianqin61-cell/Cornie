import { randomUUID } from 'node:crypto'
import { getMessagesByDate, saveMessage } from '../../db.js'
import { buildJsonRepairPrompt, parseModelJson } from '../agent/jsonProtocol.js'
import { buildConversationContext } from '../agent/contextBuilder.js'
import { buildConversationPrompt, buildToolFollowupPrompt } from '../agent/promptBuilder.js'
import { logCategoryAudit } from '../category/audit.js'
import { chat } from '../model/deepseek/client.js'
import { executeToolCalls } from '../tools/gateway.js'

const MAX_HISTORY_MESSAGES = 40
const MAX_PROTOCOL_REPAIR_RETRIES = 1

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

  throw new Error('confirmation executor protocol request failed unexpectedly')
}

function buildBaseMessages(store, date) {
  const history = getMessagesByDate(store, date)
  const context = buildConversationContext(store, { date })
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

function isCategoryCreationConfirmation(confirmation) {
  return confirmation?.confirmRequest?.kind === 'category_creation_confirmation'
}

function isCategoryMappingConfirmation(confirmation) {
  return confirmation?.confirmRequest?.kind === 'category_mapping_confirmation'
}

function getPendingActionToolCall(confirmation) {
  const pendingAction = confirmation?.confirmRequest?.pendingAction
  if (pendingAction?.toolName) {
    return {
      tool_name: pendingAction.toolName,
      arguments: pendingAction.arguments ?? {}
    }
  }

  if (Array.isArray(confirmation?.toolCalls) && confirmation.toolCalls.length > 0) {
    return confirmation.toolCalls[0]
  }

  throw new Error('pending action tool call is missing')
}

function buildCategoryCreationToolCall(confirmation, pendingActionToolCall) {
  const { domain, proposedCategoryName } = confirmation.confirmRequest ?? {}
  if (!proposedCategoryName) {
    throw new Error('proposed category name is required')
  }

  if (domain === 'ledger') {
    return {
      tool_name:
        pendingActionToolCall.tool_name === 'ledger.add_income'
          ? 'ledger_category.create_income'
          : 'ledger_category.create_expense',
      arguments: {
        name: proposedCategoryName
      }
    }
  }

  if (domain === 'todo') {
    return {
      tool_name: 'todo_category.create',
      arguments: {
        name: proposedCategoryName
      }
    }
  }

  if (domain === 'schedule') {
    return {
      tool_name: 'schedule_category.create',
      arguments: {
        name: proposedCategoryName
      }
    }
  }

  throw new Error(`unsupported category confirmation domain: ${domain}`)
}

function buildResumedActionToolCall(pendingActionToolCall, createdCategory) {
  if (!createdCategory?.id || !createdCategory?.name) {
    throw new Error('created category payload is invalid')
  }

  const nextArguments = {
    ...(pendingActionToolCall.arguments ?? {}),
    categoryId: createdCategory.id,
    categoryName: createdCategory.name
  }

  delete nextArguments.needsNewCategory
  delete nextArguments.proposedCategoryName
  delete nextArguments.proposed_category_name
  delete nextArguments.categoryProposalName

  return {
    tool_name: pendingActionToolCall.tool_name,
    arguments: nextArguments
  }
}

function buildCategoryExecutionAssistantReply(confirmation, createdCategory) {
  const proposedName = confirmation?.confirmRequest?.proposedCategoryName
  const actualName = createdCategory?.name || proposedName || '这个类目'

  if (createdCategory?.resolution === 'reused_existing') {
    return `小铃湾发现“${actualName}”已经有现成类目了，这次就不重复新建，直接帮主人继续原来的操作啦。`
  }

  return confirmation.assistantReply || '小铃湾已经照着主人的确认继续做啦。'
}

async function executeConfirmedCategoryCreation(store, confirmation) {
  const pendingActionToolCall = getPendingActionToolCall(confirmation)
  const categoryCreateToolCall = buildCategoryCreationToolCall(confirmation, pendingActionToolCall)

  const categoryCreationResult = await executeToolCalls([categoryCreateToolCall], {
    date: confirmation.date,
    store,
    source: 'confirmation'
  })

  const createdCategoryResult = categoryCreationResult.results[0]
  if (!createdCategoryResult?.ok) {
    logCategoryAudit({
      eventType: 'category_creation_failed',
      domain: confirmation.confirmRequest?.domain,
      confirmRequestId: confirmation.id,
      toolName: categoryCreateToolCall.tool_name,
      sourceText: confirmation.sourceText,
      proposedCategoryName: confirmation.confirmRequest?.proposedCategoryName,
      decision: 'failed',
      reason: createdCategoryResult?.error?.message || 'failed to create category'
    })
    throw new Error(createdCategoryResult?.error?.message || 'failed to create category')
  }

  logCategoryAudit({
    eventType:
      createdCategoryResult.result?.resolution === 'reused_existing'
        ? 'category_creation_reused_existing'
        : 'category_creation_approved',
    domain: confirmation.confirmRequest?.domain,
    confirmRequestId: confirmation.id,
    toolName: categoryCreateToolCall.tool_name,
    sourceText: confirmation.sourceText,
    categoryId: createdCategoryResult.result?.id ?? null,
    categoryName: createdCategoryResult.result?.name ?? null,
    proposedCategoryName: confirmation.confirmRequest?.proposedCategoryName,
    decision: createdCategoryResult.result?.resolution === 'reused_existing' ? 'reused' : 'created'
  })

  const resumedActionToolCall = buildResumedActionToolCall(
    pendingActionToolCall,
    createdCategoryResult.result
  )
  const resumedActionResult = await executeToolCalls([resumedActionToolCall], {
    date: confirmation.date,
    store,
    source: 'confirmation'
  })

  const resumedResult = resumedActionResult.results[0]
  logCategoryAudit({
    eventType: 'category_action_resumed',
    domain: confirmation.confirmRequest?.domain,
    confirmRequestId: confirmation.id,
    toolName: resumedActionToolCall.tool_name,
    sourceText: confirmation.sourceText,
    categoryId: createdCategoryResult.result?.id ?? null,
    categoryName: createdCategoryResult.result?.name ?? null,
    proposedCategoryName: confirmation.confirmRequest?.proposedCategoryName,
    decision: resumedResult?.ok === false ? 'failed' : 'mapped',
    reason: resumedResult?.ok === false ? resumedResult?.error?.message || 'resume failed' : 'resume_success'
  })

  return {
    type: 'tool_result',
    results: [...categoryCreationResult.results, ...resumedActionResult.results]
  }
}

async function executeConfirmedCategoryMapping(store, confirmation) {
  const pendingActionToolCall = getPendingActionToolCall(confirmation)
  const recommendedCategory = confirmation?.confirmRequest?.recommendedCategory

  if (!recommendedCategory?.id || !recommendedCategory?.name) {
    throw new Error('recommended category is missing')
  }

  const resumedActionToolCall = buildResumedActionToolCall(pendingActionToolCall, recommendedCategory)
  const resumedActionResult = await executeToolCalls([resumedActionToolCall], {
    date: confirmation.date,
    store,
    source: 'confirmation'
  })

  const resumedResult = resumedActionResult.results[0]
  logCategoryAudit({
    eventType: 'category_action_resumed',
    domain: confirmation.confirmRequest?.domain,
    confirmRequestId: confirmation.id,
    toolName: resumedActionToolCall.tool_name,
    sourceText: confirmation.sourceText,
    categoryId: recommendedCategory.id,
    categoryName: recommendedCategory.name,
    decision: resumedResult?.ok === false ? 'failed' : 'mapped',
    reason: resumedResult?.ok === false ? resumedResult?.error?.message || 'resume failed' : 'resume_success'
  })

  return {
    type: 'tool_result',
    results: resumedActionResult.results
  }
}

function buildCategoryValidationReply(error) {
  if (error?.code === 'category_name_similar') {
    const candidates = Array.isArray(error?.details?.similarCandidates)
      ? error.details.similarCandidates.map((item) => item.name).filter(Boolean)
      : []
    if (candidates.length > 0) {
      return `小铃湾发现已经有很接近的类目了，比如 ${candidates.join('、')}。这次我先不乱建，主人可以告诉我想复用哪一个。`
    }
  }

  return error?.message || '这个类目名现在还不太适合直接创建，小铃湾想再确认一下。'
}

export function createConfirmExecutor(store) {
  return {
    async execute(confirmation) {
      let toolResult
      let assistantReply = confirmation.assistantReply || '小铃湾已经照着主人的确认继续做啦。'

      try {
        if (isCategoryCreationConfirmation(confirmation)) {
          toolResult = await executeConfirmedCategoryCreation(store, confirmation)
          assistantReply = buildCategoryExecutionAssistantReply(
            confirmation,
            toolResult.results[0]?.result
          )
        } else if (isCategoryMappingConfirmation(confirmation)) {
          toolResult = await executeConfirmedCategoryMapping(store, confirmation)
          assistantReply =
            confirmation.assistantReply ||
            '小铃湾已经按主人确认的类目继续完成这次操作啦。'
        } else {
          toolResult = await executeToolCalls(confirmation.toolCalls, {
            date: confirmation.date,
            store,
            source: 'confirmation'
          })
        }
      } catch (error) {
        if (isCategoryCreationConfirmation(confirmation) && ['invalid_category_name', 'category_name_similar'].includes(error?.code)) {
          const cornieMessage = saveMessage(store, {
            id: randomUUID(),
            date: confirmation.date,
            role: 'cornie',
            content: buildCategoryValidationReply(error)
          })

          return {
            toolExecution: {
              used: false,
              results: []
            },
            cornieMessage
          }
        }

        throw error
      }

      const baseMessages = buildBaseMessages(store, confirmation.date)
      const followupMessages = buildToolFollowupMessages(
        baseMessages,
        assistantReply,
        toolResult
      )

      const envelope = await requestProtocolEnvelope(followupMessages)
      const finalReply =
        envelope.type === 'reply'
          ? envelope.assistant_reply
          : assistantReply || '小铃湾已经处理好啦。'

      const cornieMessage = saveMessage(store, {
        id: randomUUID(),
        date: confirmation.date,
        role: 'cornie',
        content: finalReply
      })

      return {
        toolExecution: {
          used: true,
          results: toolResult.results
        },
        cornieMessage
      }
    },

    reject(confirmation, options = {}) {
      const resolution = options.categoryRejectResolution
      let content

      if (isCategoryCreationConfirmation(confirmation)) {
        if (resolution?.mode === 'suggest_existing_category') {
          content = `好呀，那这次小铃湾先不新增“${confirmation.confirmRequest?.proposedCategoryName || '这个类目'}”。不过如果主人愿意，我建议改用现有类目“${resolution.suggestedCategoryName}”，这样这次动作还是可以继续完成。`
        } else if (resolution?.mode === 'ask_user_pick_existing') {
          const names = Array.isArray(resolution.candidates)
            ? resolution.candidates.map((item) => item.name).filter(Boolean).slice(0, 3)
            : []
          content =
            names.length > 0
              ? `好呀，那这次小铃湾先不新增这个类目。不过现在有几个接近的现有类目可以选：${names.join('、')}。如果主人愿意，我可以再按你选的那个继续。`
              : '好呀，那这次小铃湾先不新增这个类目，也先不继续原来的动作啦。'
        } else {
          content = '好呀，那这次小铃湾先不新增这个类目，也先不继续原来的动作啦。'
        }
      } else {
        content = '好的，这次小铃湾先不动手啦。如果主人想改主意，随时再告诉我。'
      }

      const cornieMessage = saveMessage(store, {
        id: randomUUID(),
        date: confirmation.date,
        role: 'cornie',
        content
      })
      return {
        cornieMessage,
        categoryRejectResolution: resolution ?? null
      }
    }
  }
}
