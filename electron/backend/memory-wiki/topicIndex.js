import fs from 'node:fs/promises'
import path from 'node:path'
import { resolveMemoryWikiIndexRoot } from './constants.js'

const KEYWORD_INDEX_FILENAME = 'keyword-index.json'

function normalizeString(value) {
  return String(value ?? '').trim()
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => normalizeString(item)).filter(Boolean)
}

function normalizeKey(value) {
  return normalizeString(value).toLowerCase()
}

function dedupe(items) {
  return Array.from(new Set(items))
}

export function createTopicIndexEntry(input = {}) {
  const keyword = normalizeString(input.keyword)
  const normalizedKey = normalizeString(input.normalizedKey ?? input.normalized_key) || normalizeKey(keyword)
  const aliases = dedupe(normalizeStringArray(input.aliases))

  return {
    keyword,
    normalizedKey,
    aliases,
    dates: dedupe(normalizeStringArray(input.dates)),
    chatRefs: dedupe(normalizeStringArray(input.chatRefs ?? input.chat_refs)),
    observationRefs: dedupe(normalizeStringArray(input.observationRefs ?? input.observation_refs)),
    memoryPageIds: dedupe(normalizeStringArray(input.memoryPageIds ?? input.memory_page_ids)),
    importance: normalizeString(input.importance) || 'medium',
    note: normalizeString(input.note),
    lastUpdatedAt: normalizeString(input.lastUpdatedAt ?? input.last_updated_at) || new Date().toISOString()
  }
}

export function buildTopicCandidateKeys(input = {}) {
  const keyword = normalizeString(input.keyword)
  const aliases = normalizeStringArray(input.aliases)
  return dedupe([keyword, ...aliases].map((item) => normalizeKey(item)).filter(Boolean))
}

async function ensureIndexFile(filePath) {
  try {
    await fs.access(filePath)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    await fs.writeFile(filePath, JSON.stringify({}, null, 2), 'utf8')
  }
}

export async function createTopicIndexStore(baseDir) {
  const indexRoot = resolveMemoryWikiIndexRoot(baseDir)
  await fs.mkdir(indexRoot, { recursive: true })
  const filePath = path.join(indexRoot, KEYWORD_INDEX_FILENAME)
  await ensureIndexFile(filePath)

  async function readIndexMap() {
    const text = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : {}
  }

  async function writeIndexMap(indexMap) {
    await fs.writeFile(filePath, JSON.stringify(indexMap, null, 2), 'utf8')
  }

  return {
    async get(normalizedKey) {
      const indexMap = await readIndexMap()
      const key = normalizeKey(normalizedKey)
      if (!key || !indexMap[key]) return null
      return createTopicIndexEntry(indexMap[key])
    },

    async upsert(input) {
      const entry = createTopicIndexEntry(input)
      if (!entry.keyword) {
        throw new Error('topic index keyword is required')
      }

      const indexMap = await readIndexMap()
      indexMap[entry.normalizedKey] = entry
      await writeIndexMap(indexMap)
      return entry
    },

    async updateAliases(normalizedKey, aliases) {
      const existing = await this.get(normalizedKey)
      if (!existing) {
        throw new Error(`topic index entry not found: ${normalizedKey}`)
      }
      return this.upsert({
        ...existing,
        aliases: dedupe([...(existing.aliases ?? []), ...normalizeStringArray(aliases)])
      })
    },

    async findDuplicateCandidates(input) {
      const targetKeys = buildTopicCandidateKeys(input)
      const items = await this.list()
      return items.filter((item) => {
        const itemKeys = buildTopicCandidateKeys({
          keyword: item.keyword,
          aliases: item.aliases
        })
        return itemKeys.some((key) => targetKeys.includes(key))
      })
    },

    async addDateRef(normalizedKey, date) {
      const existing = (await this.get(normalizedKey)) ?? createTopicIndexEntry({ keyword: normalizedKey })
      return this.upsert({
        ...existing,
        keyword: existing.keyword || normalizedKey,
        dates: dedupe([...existing.dates, normalizeString(date)])
      })
    },

    async linkPage(normalizedKey, pageId) {
      const existing = (await this.get(normalizedKey)) ?? createTopicIndexEntry({ keyword: normalizedKey })
      return this.upsert({
        ...existing,
        keyword: existing.keyword || normalizedKey,
        memoryPageIds: dedupe([...existing.memoryPageIds, normalizeString(pageId)])
      })
    },

    async addChatRef(normalizedKey, chatRef) {
      const existing = (await this.get(normalizedKey)) ?? createTopicIndexEntry({ keyword: normalizedKey })
      return this.upsert({
        ...existing,
        keyword: existing.keyword || normalizedKey,
        chatRefs: dedupe([...existing.chatRefs, normalizeString(chatRef)])
      })
    },

    async addObservationRef(normalizedKey, observationRef) {
      const existing = (await this.get(normalizedKey)) ?? createTopicIndexEntry({ keyword: normalizedKey })
      return this.upsert({
        ...existing,
        keyword: existing.keyword || normalizedKey,
        observationRefs: dedupe([...existing.observationRefs, normalizeString(observationRef)])
      })
    },

    async list() {
      const indexMap = await readIndexMap()
      return Object.values(indexMap)
        .map((item) => createTopicIndexEntry(item))
        .sort((a, b) => a.normalizedKey.localeCompare(b.normalizedKey, 'zh-CN'))
    },

    getFilePath() {
      return filePath
    }
  }
}
