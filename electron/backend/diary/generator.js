import { getEntry, listObservationLogs, listOnThisDay } from '../../db.js'
import { generate } from '../model/deepseek/client.js'

const DIARY_SYSTEM_PROMPT = `你是 Cornie（铃湾）或小铃湾，一只住在主人电脑右下角的独角小山羊。
你要写的是“Cornie 日记”，不是聊天总结。
请用第一人称，语气温柔、克制、文学化，像在回望今天。
不要编造没有发生过的具体事件。
如果今天很安静，也要把“安静”和陪伴感写出来。
正文请尽量写完整，控制在 600 字以内。`

function buildObservationText(observations) {
  if (!observations || observations.length === 0) {
    return '（今天没有新的观察日志）'
  }

  return observations
    .map((item) => `- [${item.type}] ${item.title}: ${item.content}`)
    .join('\n')
}

function buildMemoryText(memorySummary) {
  if (!memorySummary) return '（暂无长期记忆摘要）'
  return memorySummary
}

async function generateDiaryDraft(prompt) {
  let combined = ''
  let currentPrompt = prompt
  let round = 0
  let lastFinishReason = null

  while (round < 4) {
    const result = await generate({
      prompt: currentPrompt,
      temperature: 0.7,
      maxTokens: round === 0 ? 1100 : 500
    })

    const text = String(result?.content || '').trim()
    lastFinishReason = result?.finishReason ?? null

    if (!text) {
      break
    }

    combined = `${combined}${text}`.trim()

    if (lastFinishReason !== 'length') {
      return combined
    }

    currentPrompt = [
      '你刚才在写一篇 Cornie 日记，但上一段输出被截断了。',
      '请直接从前文最后一句继续往下写，不要重复已经写过的内容。',
      '不要重新起标题，不要重写开头。',
      '如果最后停在半句话中间，就先把那半句话补完。',
      '这一轮只继续正文。',
      '整篇日记正文总长度控制在 600 字以内。',
      '',
      '前文如下：',
      combined
    ].join('\n')

    round += 1
  }

  if (combined && !/[。！？…」』]$/.test(combined) && lastFinishReason === 'length') {
    const repairPrompt = [
      '下面这篇 Cornie 日记的最后一句被截断了。',
      '请只补完最后一句，不要重复前文，不要新开段落。',
      '补完后整篇正文仍控制在 600 字以内。',
      '',
      combined
    ].join('\n')

    const repair = await generate({ prompt: repairPrompt, temperature: 0.6, maxTokens: 120 })
    const repaired = String(repair?.content || '').trim()
    if (repaired) {
      combined = `${combined}${repaired}`.trim()
    }
  }

  return combined
}

export async function generateCornieDiary(store, { date, memorySummary = '' }) {
  const entry = getEntry(store, date)
  const observations = listObservationLogs(store, { date, limit: 20 })
  const onThisDay = listOnThisDay(store, { date, limit: 10 })

  const prompt = [
    DIARY_SYSTEM_PROMPT,
    '',
    `日期：${date}`,
    '',
    `主人今天写下的日记：\n${entry.userText || '（空）'}`,
    '',
    `今天的观察日志：\n${buildObservationText(observations)}`,
    '',
    `相关记忆摘要：\n${buildMemoryText(memorySummary)}`,
    '',
    `往年今日参考：\n${
      onThisDay.length
        ? onThisDay.map((item) => `- ${item.date}: ${item.userText || item.cornieText || '（空）'}`).join('\n')
        : '（无）'
    }`,
    '',
    '请直接写出 Cornie 日记正文：'
  ].join('\n')

  try {
    const text = await generateDiaryDraft(prompt)
    if (text) return text
  } catch (error) {
    console.error('DeepSeek diary generation error:', error)
  }

  return '今天我在主人身边安静地陪着，许多细碎的心情都像小小的星光，落在角落里。'
}
