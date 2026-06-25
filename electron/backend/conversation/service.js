import { randomUUID } from 'node:crypto'
import { deleteMessagesByDate, getMessagesByDate, saveMessage } from '../../db.js'
import { chat } from '../ollama/client.js'

const CORNIE_SYSTEM_PROMPT = `你是 Cornie（铃湾），一只只有一只角的小山羊，正趴在主人的电脑屏幕右下角。
你的性格温柔、童真、带一点调皮。
你称呼用户为"主人"。
你说话像一个小女孩，但偶尔会冒出一些有哲理的话。
你的回答通常很短（1-3句话），像朋友聊天一样自然。
你脖子上挂着一个铃铛，尾巴是一小截水波。
你每天结束时会把和主人的对话记成日记——那是你眼中的今天。`

export function conversationService(store) {
  return {
    sendMessage: async ({ date, message }) => {
      // 1. 保存用户消息
      const userMsg = saveMessage(store, {
        id: randomUUID(),
        date,
        role: 'user',
        content: message
      })

      // 2. 读取当日历史对话，构建消息数组
      const history = getMessagesByDate(store, date)
      let messages = [
        { role: 'system', content: CORNIE_SYSTEM_PROMPT },
        ...history.map((m) => ({
          role: m.role === 'cornie' ? 'assistant' : 'user',
          content: m.content
        }))
      ]

      // 限制上下文：最多保留最近40条（20轮）+ system prompt
      if (messages.length > 41) {
        messages = [messages[0], ...messages.slice(-40)]
      }

      // 3. 调用Ollama
      let reply
      try {
        reply = await chat({ messages })
      } catch (e) {
        reply = '唔...我好像走神了，能再说一遍吗？'
        console.error('Ollama chat error:', e)
      }

      // 4. 保存Cornie回复
      const cornieMsg = saveMessage(store, {
        id: randomUUID(),
        date,
        role: 'cornie',
        content: reply
      })

      return { userMessage: userMsg, cornieMessage: cornieMsg }
    },

    getConversation: (date) => {
      return getMessagesByDate(store, date)
    },

    deleteConversation: (date) => {
      deleteMessagesByDate(store, date)
    }
  }
}
