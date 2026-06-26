import {
  deleteMemoryEntry,
  getMemoryEntry,
  listActiveMemoryEntries,
  saveMemoryEntry,
  searchMemoryEntries,
  touchMemoryEntry,
  updateMemoryEntry
} from '../../db.js'

function normalizeMemoryInput(input = {}) {
  return {
    kind: String(input.kind ?? 'event'),
    title: String(input.title ?? '').trim(),
    content: String(input.content ?? '').trim(),
    tags: Array.isArray(input.tags) ? input.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    sourceText: input.source_text ?? input.sourceText ?? null,
    weight: input.weight ?? 1,
    isActive: input.is_active ?? input.isActive,
    summaryGroup: input.summary_group ?? input.summaryGroup ?? null
  }
}

function shouldWriteMemory({ text, kind, content }) {
  const normalized = `${text ?? ''}\n${content ?? ''}`.trim()
  if (!normalized) return false
  if (kind === 'event') return normalized.length >= 20

  const patterns = [
    '喜欢',
    '讨厌',
    '不喜欢',
    '偏好',
    '习惯',
    '目标',
    '重要',
    '长期',
    '一直',
    '总是'
  ]
  return patterns.some((pattern) => normalized.includes(pattern))
}

function deriveMemoryFromConversation({ date, userMessage, cornieMessage }) {
  const text = `${userMessage}\n${cornieMessage}`.trim()
  if (!shouldWriteMemory({ text, kind: 'event', content: text })) return null

  const lower = text.toLowerCase()
  let kind = 'event'
  if (/喜欢|偏好|不喜欢|讨厌/.test(lower)) kind = 'preference'
  if (/目标|想要|计划/.test(lower)) kind = 'goal'
  if (/人名|朋友|家人/.test(lower)) kind = 'person'

  const title = String(userMessage).slice(0, 18) || '对话记忆'
  return {
    kind,
    title,
    content: `主人：${userMessage}\n铃湾：${cornieMessage}`,
    tags: kind === 'preference' ? ['偏好'] : kind === 'goal' ? ['目标'] : ['对话'],
    sourceText: text,
    weight: kind === 'goal' ? 1.5 : 1
  }
}

export function createMemoryService(store) {
  return {
    create: (input) => {
      const memory = normalizeMemoryInput(input)
      if (!memory.title) throw new Error('memory title is required')
      if (!memory.content) throw new Error('memory content is required')
      return saveMemoryEntry(store, memory)
    },
    update: (input) => {
      if (!input.id) throw new Error('memory id is required')
      const memory = normalizeMemoryInput(input)
      return updateMemoryEntry(store, {
        id: input.id,
        kind: memory.kind,
        title: memory.title,
        content: memory.content,
        tags: memory.tags,
        sourceText: memory.sourceText,
        weight: memory.weight,
        isActive: memory.isActive,
        summaryGroup: memory.summaryGroup
      })
    },
    delete: ({ id }) => deleteMemoryEntry(store, id),
    listActive: ({ kind, limit } = {}) => listActiveMemoryEntries(store, { kind, limit }),
    search: ({ query, tags, kind, limit } = {}) => searchMemoryEntries(store, { query, tags, kind, limit }),
    get: (id) => getMemoryEntry(store, id),
    touch: (id) => touchMemoryEntry(store, id),
    shouldWrite: shouldWriteMemory,
    deriveFromConversation: deriveMemoryFromConversation
  }
}
