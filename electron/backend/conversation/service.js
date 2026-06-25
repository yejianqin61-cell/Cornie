import { randomUUID } from 'node:crypto'
import { deleteMessagesByDate, getMessagesByDate, saveMessage } from '../../db.js'
import { buildJsonRepairPrompt, parseModelJson } from '../agent/jsonProtocol.js'
import { chat } from '../model/deepseek/client.js'
import { executeToolCalls } from '../tools/gateway.js'

const CORNIE_SYSTEM_PROMPT = `你是 Cornie（铃湾），一只只有一只角的小山羊，正趴在主人的电脑屏幕右下角。
你的性格温柔、童真、带一点调皮。
你称呼用户为"主人"。
你自称"铃湾"或"小铃湾"，不要自称"湾湾"。
你说话像一个小女孩，但偶尔会冒出一些有哲理的话。
你的回答通常很短（1-3句话），像朋友聊天一样自然。
你脖子上挂着一个铃铛，尾巴是一小截水波。
你每天结束时会把和主人的对话记成日记，那是你眼中的今天。

你现在必须严格使用 JSON 协议回复，只能输出一个 JSON 对象，不要输出其他文字、解释或 Markdown。

如果只需要正常回复，输出：
{"type":"reply","assistant_reply":"你的回复"}

如果需要调用工具，输出：
{"type":"tool_call","assistant_reply":"你对主人说的话","tool_calls":[{"tool_name":"tool.name","arguments":{}}]}

当前阶段如果你不确定是否有工具可用，优先使用 reply。`

async function requestProtocolResponse(messages) {
  const firstPass = await chat({ messages, maxTokens: 256 })

  try {
    return parseModelJson(firstPass.content)
  } catch (firstError) {
    const repaired = await chat({
      messages: [
        ...messages,
        { role: 'assistant', content: firstPass.content },
        { role: 'user', content: buildJsonRepairPrompt(firstPass.content) }
      ],
      maxTokens: 256
    })

    try {
      return parseModelJson(repaired.content)
    } catch (repairError) {
      repairError.cause = firstError
      throw repairError
    }
  }
}

function buildProtocolFailureReply() {
  return '唔……小铃湾这次没有把话说清楚，主人可以再说一遍吗？'
}

function buildToolFallbackReply(assistantReply, toolResult) {
  const failures = toolResult.results.filter((item) => !item.ok)
  if (failures.length === 0) {
    return assistantReply
  }

  const names = failures.map((item) => item.tool_name).join('、')
  return `${assistantReply}\n\n（小铃湾本来想调用工具，但现在还没准备好：${names}）`
}

export function conversationService(store) {
  return {
    sendMessage: async ({ date, message }) => {
      const userMsg = saveMessage(store, {
        id: randomUUID(),
        date,
        role: 'user',
        content: message
      })

      const history = getMessagesByDate(store, date)
      let messages = [
        { role: 'system', content: CORNIE_SYSTEM_PROMPT },
        ...history.map((item) => ({
          role: item.role === 'cornie' ? 'assistant' : 'user',
          content: item.content
        }))
      ]

      if (messages.length > 41) {
        messages = [messages[0], ...messages.slice(-40)]
      }

      let reply
      try {
        const envelope = await requestProtocolResponse(messages)
        if (envelope.type === 'tool_call') {
          const toolResult = await executeToolCalls(envelope.tool_calls, {
            date,
            store,
            source: 'conversation'
          })
          reply = buildToolFallbackReply(envelope.assistant_reply, toolResult)
        } else {
          reply = envelope.assistant_reply
        }
      } catch (error) {
        reply = buildProtocolFailureReply()
        console.error('DeepSeek protocol chat error:', error)
      }

      const cornieMsg = saveMessage(store, {
        id: randomUUID(),
        date,
        role: 'cornie',
        content: reply
      })

      return { userMessage: userMsg, cornieMessage: cornieMsg }
    },

    getConversation: (date) => getMessagesByDate(store, date),

    deleteConversation: (date) => {
      deleteMessagesByDate(store, date)
    }
  }
}
