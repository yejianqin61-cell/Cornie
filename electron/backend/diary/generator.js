import { getEntry, listObservationLogs, listOnThisDay } from '../../db.js'
import { generate } from '../model/deepseek/client.js'

const DIARY_SYSTEM_PROMPT = `你是 Cornie（铃湾）或小铃湾，一只住在主人电脑右下角的独角小山羊。
你要写的是“Cornie 日记”，不是聊天总结。
请用第一人称，语气温柔、克制、文学化，像在回望今天。
不要编造没有发生过的具体事件。
如果今天很安静，也要把“安静”和陪伴感写出来。`

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

  const first = await generate({ prompt, temperature: 0.7, maxTokens: 420 })
  combined = String(first?.content || '').trim()

  if (!combined) {
    return ''
  }

  if (first?.finishReason !== 'length') {
    return combined
  }

  const continuePrompt = [
    '你刚才在写一篇 Cornie 日记，但上一段输出被截断了。',
    '请从最后一句自然续写，不要重复前文，不要重新起标题。',
    '如果上一句停在半句中间，就直接把那句话续完再继续。',
    '',
    '前文如下：',
    combined
  ].join('\n')

  const second = await generate({ prompt: continuePrompt, temperature: 0.7, maxTokens: 220 })
  const continuation = String(second?.content || '').trim()
  if (!continuation) {
    return combined
  }

  return `${combined}${combined.endsWith('\n') ? '' : ''}${continuation}`.trim()
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
