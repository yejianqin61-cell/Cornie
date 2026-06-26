import { randomUUID } from 'node:crypto'
import { getMessagesByDate, saveMessage } from '../../db.js'
import { buildJsonRepairPrompt, parseModelJson } from '../agent/jsonProtocol.js'
import { buildConversationContext } from '../agent/contextBuilder.js'
import { buildConversationPrompt, buildToolFollowupPrompt } from '../agent/promptBuilder.js'
import { executeToolCalls } from '../tools/gateway.js'
import { chat } from '../model/deepseek/client.js'

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

export function createConfirmExecutor(store) {
  return {
    async execute(confirmation) {
      const toolResult = await executeToolCalls(confirmation.toolCalls, {
        date: confirmation.date,
        store,
        source: 'confirmation'
      })

      const baseMessages = buildBaseMessages(store, confirmation.date)
      const followupMessages = buildToolFollowupMessages(
        baseMessages,
        confirmation.assistantReply || '小铃湾已经照着主人的确认继续做啦。',
        toolResult
      )

      const envelope = await requestProtocolEnvelope(followupMessages)
      const finalReply =
        envelope.type === 'reply'
          ? envelope.assistant_reply
          : confirmation.assistantReply || '小铃湾已经处理好了。'

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

    reject(confirmation) {
      const content = '好的，这次小铃湾先不动手啦。如果主人想改主意，随时再告诉我。'
      const cornieMessage = saveMessage(store, {
        id: randomUUID(),
        date: confirmation.date,
        role: 'cornie',
        content
      })
      return { cornieMessage }
    }
  }
}
