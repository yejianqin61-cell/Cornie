import fs from 'node:fs/promises'
import path from 'node:path'
import { resolveMemoryWikiIndexRoot } from './constants.js'

const KEYWORD_INDEX_FILENAME = 'keyword-index.json'

const DAY_MS = 86_400_000

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

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseDateSafe(value) {
  const timestamp = Date.parse(normalizeString(value))
  return Number.isFinite(timestamp) ? timestamp : null
}

function calcImportanceBonus(importance) {
  const normalized = normalizeString(importance)
  if (normalized === 'critical') return 4
  if (normalized === 'high') return 2.5
  if (normalized === 'medium') return 1.2
  return 0.4
}

export function calculateTopicHeat(input = {}, { now = new Date() } = {}) {
  const currentTime = now instanceof Date ? now.getTime() : Date.parse(String(now))
  const dates = normalizeStringArray(input.dates)
  const explicitImportance = normalizeString(input.importance)
  const pinned = input.pinned === true
  const lastMentionedAt = normalizeString(input.lastMentionedAt ?? input.last_mentioned_at)
  const lastTouched =
    parseDateSafe(lastMentionedAt) ??
    dates
      .map((item) => parseDateSafe(item))
      .filter((item) => item != null)
      .sort((a, b) => b - a)[0] ??
    parseDateSafe(input.lastUpdatedAt ?? input.last_updated_at) ??
    currentTime

  const ageDays = Math.max(0, (currentTime - lastTouched) / DAY_MS)

  let freshnessWeight = 0.2
  if (ageDays <= 7) freshnessWeight = 1
  else if (ageDays <= 30) freshnessWeight = 0.65
  else if (ageDays <= 90) freshnessWeight = 0.35

  const mentionScore = Math.min(6, dates.length * 0.8)
  const linkScore =
    normalizeStringArray(input.memoryPageIds ?? input.memory_page_ids).length * 0.5 +
    normalizeStringArray(input.chatRefs ?? input.chat_refs).length * 0.25 +
    normalizeStringArray(input.observationRefs ?? input.observation_refs).length * 0.25
  const importanceBonus = calcImportanceBonus(explicitImportance)
  const pinnedBonus = pinned ? 4 : 0

  const heatScore = Number((freshnessWeight * 5 + mentionScore + linkScore + importanceBonus + pinnedBonus).toFixed(2))

  return {
    heatScore,
    ageDays: Number(ageDays.toFixed(2)),
    freshnessWeight,
    lastMentionedAt: new Date(lastTouched).toISOString()
  }
}

export function createTopicIndexEntry(input = {}) {
  const keyword = normalizeString(input.keyword)
  const normalizedKey = normalizeString(input.normalizedKey ?? input.normalized_key) || normalizeKey(keyword)
  const aliases = dedupe(normalizeStringArray(input.aliases))
  const heat = calculateTopicHeat(input)

  return {
    keyword,
    normalizedKey,
    aliases,
    dates: dedupe(normalizeStringArray(input.dates)),
    chatRefs: dedupe(normalizeStringArray(input.chatRefs ?? input.chat_refs)),
    observationRefs: dedupe(normalizeStringArray(input.observationRefs ?? input.observation_refs)),
    memoryPageIds: dedupe(normalizeStringArray(input.memoryPageIds ?? input.memory_page_ids)),
    importance: normalizeString(input.importance) || 'medium',
    pinned: input.pinned === true,
    note: normalizeString(input.note),
    heatScore: normalizeNumber(input.heatScore ?? input.heat_score, heat.heatScore),
    freshnessWeight: normalizeNumber(input.freshnessWeight ?? input.freshness_weight, heat.freshnessWeight),
    ageDays: normalizeNumber(input.ageDays ?? input.age_days, heat.ageDays),
    lastMentionedAt: normalizeString(input.lastMentionedAt ?? input.last_mentioned_at) || heat.lastMentionedAt,
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

    async unlinkPage(normalizedKey, pageId) {
      const existing = await this.get(normalizedKey)
      if (!existing) {
        throw new Error(`topic index entry not found: ${normalizedKey}`)
      }
      return this.upsert({
        ...existing,
        memoryPageIds: existing.memoryPageIds.filter((item) => item !== normalizeString(pageId))
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
        .sort((a, b) => {
          if (b.heatScore !== a.heatScore) return b.heatScore - a.heatScore
          return a.normalizedKey.localeCompare(b.normalizedKey, 'zh-CN')
        })
    },

    async mergeTopics({ targetNormalizedKey, sourceNormalizedKey }) {
      const target = await this.get(targetNormalizedKey)
      const source = await this.get(sourceNormalizedKey)
      if (!target || !source) {
        throw new Error('topic index merge entries not found')
      }

      const merged = await this.upsert({
        ...target,
        keyword: target.keyword || source.keyword,
        normalizedKey: target.normalizedKey,
        aliases: dedupe([
          ...(target.aliases ?? []),
          ...(source.aliases ?? []),
          source.keyword,
          source.normalizedKey
        ]),
        dates: dedupe([...(target.dates ?? []), ...(source.dates ?? [])]),
        chatRefs: dedupe([...(target.chatRefs ?? []), ...(source.chatRefs ?? [])]),
        observationRefs: dedupe([...(target.observationRefs ?? []), ...(source.observationRefs ?? [])]),
        memoryPageIds: dedupe([...(target.memoryPageIds ?? []), ...(source.memoryPageIds ?? [])]),
        note: [target.note, source.note].filter(Boolean).join('\n').trim() || target.note || source.note
      })

      const indexMap = await readIndexMap()
      delete indexMap[normalizeKey(sourceNormalizedKey)]
      indexMap[merged.normalizedKey] = merged
      await writeIndexMap(indexMap)

      return {
        target: merged,
        removedSourceNormalizedKey: normalizeKey(sourceNormalizedKey)
      }
    },

    getFilePath() {
      return filePath
    }
  }
}
