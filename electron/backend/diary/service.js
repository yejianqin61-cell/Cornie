import { getEntry, getMessagesByDate, listEntries, listOnThisDay, setCornieText, upsertUserText } from '../../db.js'
import { generate } from '../model/deepseek/client.js'

const DIARY_SYSTEM_PROMPT = `你是一只叫Cornie（铃湾）的独角山羊，正在写今天的日记。
以下是主人今天和你的所有对话记录，请以Cornie的第一人称视角，写一篇今天的日记。

要求：
- 语气温柔、童真，像一个小女孩在记录今天发生的事
- 字数50-150字
- 总结今天主人聊了什么、主人的情绪如何
- 写写Cornie自己的感受
- 不要编造对话中不存在的内容
- 如果对话很少或没有对话，写今天主人很安静，你一直陪着`

export function diaryService(store) {
  const svc = {
    listEntries: ({ month }) => listEntries(store, { month }),
    getEntry: (date) => getEntry(store, date),
    upsertUserText: ({ date, userText, cornieText }) => upsertUserText(store, { date, userText, cornieText }),
    listOnThisDay: ({ date, limit }) => listOnThisDay(store, { date, limit }),

    generateCornie: async ({ date }) => {
      const messages = getMessagesByDate(store, date)

      let conversationText
      if (messages.length === 0) {
        conversationText = '（今天主人没有和我说话）'
      } else {
        conversationText = messages
          .map((m) => `[${m.role === 'user' ? '主人' : 'Cornie'}]: ${m.content}`)
          .join('\n')
      }

      const prompt = `${DIARY_SYSTEM_PROMPT}

---
${conversationText}
---

Cornie的日记：`

      let diary
      try {
        const result = await generate({ prompt, temperature: 0.7, maxTokens: 300 })
        diary = result.content.trim()
        if (!diary || diary.length < 6) {
          diary = '今天主人很安静呢，我就一直趴在屏幕角落陪着。希望主人明天开心。'
        }
      } catch (e) {
        console.error('DeepSeek diary generation error:', e)
        diary = '今天我也在角落里陪着你。等你愿意说点什么，我就能把这一天好好记下来。'
      }

      return setCornieText(store, { date, cornieText: diary })
    },

    regenerateCornie: ({ date }) => svc.generateCornie({ date })
  }
  return svc
}
