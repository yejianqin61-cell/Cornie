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

function normalizeCompareText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function buildObservationFingerprint(input = {}) {
  return [input.date, input.type, normalizeCompareText(input.title), normalizeCompareText(input.content)].join('::')
}

function buildObservationSearchText(input = {}) {
  return [input.title, input.content, input.sourceText].map((item) => normalizeCompareText(item)).filter(Boolean).join('\n')
}

function buildObservationPatch(existing, incoming) {
  const nextTitle = incoming.title || existing.title
  const nextContent = incoming.content || existing.content
  const nextRelatedRef = incoming.relatedRef ?? existing.relatedRef ?? null
  const nextSourceText = incoming.sourceText ?? existing.sourceText ?? null

  const patch = {}
  if (nextTitle !== existing.title) patch.title = nextTitle
  if (nextContent !== existing.content) patch.content = nextContent
  if ((nextRelatedRef ?? null) !== (existing.relatedRef ?? null)) patch.relatedRef = nextRelatedRef
  if ((nextSourceText ?? null) !== (existing.sourceText ?? null)) patch.sourceText = nextSourceText

  return patch
}

function mergeObservation(existing, incoming) {
  const title = incoming.title || existing.title
  const relatedRef = incoming.relatedRef ?? existing.relatedRef ?? null
  const sourceText = incoming.sourceText ?? existing.sourceText ?? null

  const incomingContent = String(incoming.content ?? '').trim()
  const existingContent = String(existing.content ?? '').trim()
  const normalizedIncoming = normalizeCompareText(incomingContent)
  const normalizedExisting = normalizeCompareText(existingContent)

  let content = existingContent
  if (!normalizedIncoming) {
    content = existingContent
  } else if (!normalizedExisting) {
    content = incomingContent
  } else if (normalizedIncoming === normalizedExisting || normalizedExisting.includes(normalizedIncoming)) {
    content = existingContent
  } else if (normalizedIncoming.includes(normalizedExisting)) {
    content = incomingContent
  } else {
    content = `${existingContent}\n\n补充：${incomingContent}`.trim()
  }

  return {
    ...existing,
    title,
    content,
    relatedRef,
    sourceText
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
  function listByDate(date) {
    return listObservationLogs(store, { date, limit: 200 })
  }

  function findDuplicateNote(note, items = []) {
    const fingerprint = buildObservationFingerprint(note)
    return items.find((item) => buildObservationFingerprint(item) === fingerprint) ?? null
  }

  function findIncrementalCandidate(note, items = []) {
    const incomingText = buildObservationSearchText(note)
    if (!incomingText) return null

    return (
      items.find((item) => {
        if (String(item.type ?? '') !== String(note.type ?? '')) return false
        const existingText = buildObservationSearchText(item)
        if (!existingText) return false
        return existingText.includes(incomingText) || incomingText.includes(existingText)
      }) ?? null
    )
  }

  function prepareNote(input) {
    const note = normalizeObservationInput(input)
    if (!note.title) throw new Error('observation title is required')
    if (!note.content) throw new Error('observation content is required')

    const todayItems = listByDate(note.date)
    const exactMatch = findDuplicateNote(note, todayItems)
    if (exactMatch) {
      return {
        mode: 'duplicate',
        note: exactMatch,
        existing: exactMatch,
        changed: false
      }
    }

    const incrementalMatch = findIncrementalCandidate(note, todayItems)
    if (incrementalMatch) {
      const merged = mergeObservation(incrementalMatch, note)
      const patch = buildObservationPatch(incrementalMatch, merged)
      return {
        mode: Object.keys(patch).length === 0 ? 'duplicate' : 'merge',
        note: merged,
        existing: incrementalMatch,
        patch,
        changed: Object.keys(patch).length > 0
      }
    }

    return {
      mode: 'create',
      note,
      existing: null,
      changed: true
    }
  }

  function addNoteSmart(input) {
    const prepared = prepareNote(input)
    if (prepared.mode === 'duplicate') {
      return {
        action: 'duplicate',
        note: prepared.note
      }
    }

    if (prepared.mode === 'merge' && prepared.existing?.id) {
      return {
        action: 'merged',
        note: updateObservationLog(store, {
          id: prepared.existing.id,
          ...prepared.patch
        })
      }
    }

    return {
      action: 'created',
      note: saveObservationLog(store, prepared.note)
    }
  }

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
    listByDate,
    listToday: (date = new Date().toISOString().slice(0, 10)) => listObservationLogs(store, { date }),
    listByRange: ({ from, to, type, limit }) => listObservationLogs(store, { from, to, type, limit }),
    prepareNote,
    addNoteSmart,
    recordConversationTurn: ({ date, userMessage, cornieMessage }) => {
      if (!shouldRecordObservation({ userMessage, cornieMessage })) return null

      const note = deriveConversationObservation({ date, userMessage, cornieMessage })
      return addNoteSmart(note).note
    }
  }
}
