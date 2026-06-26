import { deleteObservationLog, getObservationLog, listObservationLogs, saveObservationLog, updateObservationLog } from '../../db.js'

function normalizeObservationInput(input = {}) {
  return {
    date: String(input.date ?? new Date().toISOString().slice(0, 10)),
    type: String(input.type ?? 'misc'),
    title: String(input.title ?? '').trim(),
    content: String(input.content ?? '').trim(),
    relatedRef: input.related_ref ?? input.relatedRef ?? null,
    sourceText: input.source_text ?? input.sourceText ?? null
  }
}

function shouldRecordObservation({ userMessage, cornieMessage }) {
  const text = `${userMessage ?? ''}\n${cornieMessage ?? ''}`.trim()
  if (!text) return false

  const keywords = [
    '买',
    '花',
    '工资',
    '待办',
    '日程',
    '会议',
    '提醒',
    '喜欢',
    '讨厌',
    '开心',
    '难过',
    '想要',
    '不要',
    '今天',
    '明天',
    '下周',
    '记一下'
  ]

  if (text.length >= 24) return true
  return keywords.some((keyword) => text.includes(keyword))
}

function deriveConversationObservation({ date, userMessage, cornieMessage }) {
  const title = userMessage.slice(0, 16) || '对话记录'
  return {
    date,
    type: 'event',
    title,
    content: `主人：${userMessage}\n铃湾：${cornieMessage}`,
    relatedRef: date,
    sourceText: `${userMessage}\n${cornieMessage}`
  }
}

export function createObservationService(store) {
  return {
    addNote: (input) => {
      const note = normalizeObservationInput(input)
      if (!note.title) throw new Error('observation title is required')
      if (!note.content) throw new Error('observation content is required')
      return saveObservationLog(store, note)
    },
    updateNote: (input) => {
      if (!input.id) throw new Error('observation id is required')
      return updateObservationLog(store, {
        id: input.id,
        date: input.date,
        type: input.type,
        title: input.title,
        content: input.content,
        relatedRef: input.related_ref ?? input.relatedRef,
        sourceText: input.source_text ?? input.sourceText
      })
    },
    deleteNote: ({ id }) => {
      deleteObservationLog(store, id)
    },
    get: (id) => getObservationLog(store, id),
    listToday: (date = new Date().toISOString().slice(0, 10)) => listObservationLogs(store, { date }),
    listByRange: ({ from, to, type, limit }) => listObservationLogs(store, { from, to, type, limit }),
    recordConversationTurn: ({ date, userMessage, cornieMessage }) => {
      if (!shouldRecordObservation({ userMessage, cornieMessage })) return null

      const note = deriveConversationObservation({ date, userMessage, cornieMessage })
      return saveObservationLog(store, note)
    }
  }
}
