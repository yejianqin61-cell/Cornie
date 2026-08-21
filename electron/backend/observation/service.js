import { deleteObservationLog, getObservationLog, listObservationLogs, saveObservationLog, updateObservationLog } from '../../db.js'
import { buildObservationPromptPolicySummary, getObservationPromptPolicy, OBSERVATION_PROMPT_POLICY } from './policy.js'
import { enqueueObservationCompressionCandidates } from './governance.js'
import { badRequest, HttpError } from '../http/errors.js'

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
  return [input.title, input.content, input.sourceText, input.relatedRef].map((item) => normalizeCompareText(item)).filter(Boolean).join('\n')
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

export function createObservationService(store) {
  function listByRecall({ date, from, to, type, q, topic, person, limit } = {}) {
    const explicitQuery = String(q ?? '').trim()
    const topicQuery = String(topic ?? '').trim()
    const personQuery = String(person ?? '').trim()
    const mergedQuery = [explicitQuery, topicQuery, personQuery].filter(Boolean).join(' ').trim()

    return listObservationLogs(store, {
      date,
      from,
      to,
      type,
      q: mergedQuery || undefined,
      limit
    })
  }

  function listByDate(date) {
    return listObservationLogs(store, { date, limit: OBSERVATION_PROMPT_POLICY.todayArchiveDefaultLimit })
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
    if (!note.title) throw badRequest('observation title is required', undefined, 'title_required')
    if (!note.content) throw badRequest('observation content is required', undefined, 'content_required')

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
      if (!note.title) throw badRequest('observation title is required', undefined, 'title_required')
      if (!note.content) throw badRequest('observation content is required', undefined, 'content_required')
      return saveObservationLog(store, note)
    },
    updateNote: (input) => {
      if (!input.id) throw badRequest('observation id is required', undefined, 'entry_id_required')
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
    listByRange: ({ from, to, type, q, limit }) => listObservationLogs(store, { from, to, type, q, limit }),
    listByRecall,
    listTodayForConversation: (date) => listObservationLogs(store, {
      date,
      limit: OBSERVATION_PROMPT_POLICY.conversationTodaySummaryLimit
    }),
    listTodayForWikiRecall: (date) => listObservationLogs(store, {
      date,
      limit: OBSERVATION_PROMPT_POLICY.wikiRecallTodayLimit
    }),
    listTodayForDiary: (date) => listObservationLogs(store, {
      date,
      limit: OBSERVATION_PROMPT_POLICY.diaryTodayDetailLimit
    }),
    enqueueCompressionCandidates: ({ baseDir = process.cwd(), date, observations } = {}) =>
      enqueueObservationCompressionCandidates(store, { baseDir, date, observations }),
    getPromptPolicy: () => getObservationPromptPolicy(),
    getPromptPolicySummary: () => buildObservationPromptPolicySummary(),
    prepareNote,
    addNoteSmart
  }
}
