import { createMemoryWikiService, createTopicIndexStore } from '../memory-wiki/index.js'
import { createChatlogService } from '../chatlog/service.js'
import { createObservationService } from '../observation/service.js'

const DEFAULT_MEMORY_PAGE_LIMIT = 4
const DEFAULT_TOPIC_LIMIT = 4
const DEFAULT_MESSAGE_HIT_LIMIT = 3
const DEFAULT_OBSERVATION_LIMIT = 3
const IDENTITY_PROFILE_PAGE_TYPE = 'identity_profile'

const IMPORTANCE_WEIGHT = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
}

function normalizeString(value) {
  return String(value ?? '').trim()
}

function scorePage(page) {
  const importanceScore = IMPORTANCE_WEIGHT[normalizeString(page.importance).toLowerCase()] ?? 0
  const confirmedScore = page.ownerConfirmed ? 2 : 0
  const summaryScore = page.summary ? 1 : 0
  return importanceScore + confirmedScore + summaryScore
}

function isIdentityProfilePage(page) {
  return normalizeString(page?.pageType) === IDENTITY_PROFILE_PAGE_TYPE
}

function comparePages(a, b) {
  return scorePage(b) - scorePage(a) || String(a.title).localeCompare(String(b.title), 'zh-CN')
}

function selectPrimaryIdentityProfile(pages) {
  const identityPages = pages.filter(isIdentityProfilePage)
  if (identityPages.length === 0) {
    return null
  }

  return [...identityPages].sort(comparePages)[0] ?? null
}

function scoreTopic(item) {
  const importanceScore = IMPORTANCE_WEIGHT[normalizeString(item.importance).toLowerCase()] ?? 0
  const dateScore = Array.isArray(item.dates) ? Math.min(item.dates.length, 3) : 0
  const pageScore = Array.isArray(item.memoryPageIds) ? Math.min(item.memoryPageIds.length, 2) : 0
  return importanceScore + dateScore + pageScore
}

function buildPageSummaryLine(page) {
  const importance = normalizeString(page.importance) || 'medium'
  const summary = normalizeString(page.summary) || '暂无摘要'
  return `- [${importance}] ${page.title}: ${summary}`
}

function buildIdentityProfileSummaryLine(page) {
  const summary = normalizeString(page.summary) || '暂无主身份摘要'
  return `- [identity] ${page.title}: ${summary}`
}

function buildTopicSummaryLine(item) {
  const dates = Array.isArray(item.dates) ? item.dates.slice(-2).join(' / ') : ''
  const note = normalizeString(item.note)
  const extra = [dates, note].filter(Boolean).join('；')
  return `- ${item.keyword}${extra ? `: ${extra}` : ''}`
}

export async function buildWikiContext(
  store,
  { date, baseDir, query = '', pageLimit = DEFAULT_MEMORY_PAGE_LIMIT, topicLimit = DEFAULT_TOPIC_LIMIT } = {}
) {
  const memoryWiki = await createMemoryWikiService({ baseDir })
  const topicIndex = await createTopicIndexStore(baseDir)
  const chatlog = createChatlogService(store)
  const observation = createObservationService(store)

  const pageSummaries = await memoryWiki.listSummaries({ status: 'active' })
  const primaryIdentityProfile = selectPrimaryIdentityProfile(pageSummaries)
  const otherPages = [...pageSummaries]
    .filter((page) => !primaryIdentityProfile || page.id !== primaryIdentityProfile.id)
    .sort(comparePages)
  const selectedPages = [
    ...(primaryIdentityProfile ? [primaryIdentityProfile] : []),
    ...otherPages.slice(0, Math.max(pageLimit - (primaryIdentityProfile ? 1 : 0), 0))
  ]

  const topics = await topicIndex.list()
  const normalizedQuery = normalizeString(query).toLowerCase()
  const selectedTopics = [...topics]
    .sort((a, b) => {
      const queryHitA = normalizedQuery && normalizeString(`${a.keyword} ${(a.aliases ?? []).join(' ')} ${a.note}`).toLowerCase().includes(normalizedQuery) ? 1 : 0
      const queryHitB = normalizedQuery && normalizeString(`${b.keyword} ${(b.aliases ?? []).join(' ')} ${b.note}`).toLowerCase().includes(normalizedQuery) ? 1 : 0
      if (queryHitA !== queryHitB) return queryHitB - queryHitA
      return scoreTopic(b) - scoreTopic(a)
    })
    .slice(0, topicLimit)

  const chatHits = normalizedQuery
    ? chatlog.searchDatesByKeyword(normalizedQuery).entries.slice(0, DEFAULT_MESSAGE_HIT_LIMIT)
    : []
  const todayObservations = observation.listByDate(date).slice(0, DEFAULT_OBSERVATION_LIMIT)

  const memorySummaryLines = []
  if (primaryIdentityProfile) {
    memorySummaryLines.push(buildIdentityProfileSummaryLine(primaryIdentityProfile))
  }

  memorySummaryLines.push(
    ...selectedPages
      .filter((page) => !primaryIdentityProfile || page.id !== primaryIdentityProfile.id)
      .map(buildPageSummaryLine)
  )

  const memorySummary = memorySummaryLines.length === 0
    ? '当前没有可注入的长期记忆 wiki 页面。'
    : memorySummaryLines.join('\n')

  const topicSummary = selectedTopics.length === 0
    ? '当前没有高相关主题索引。'
    : selectedTopics.map(buildTopicSummaryLine).join('\n')

  const chatSummary = chatHits.length === 0
    ? '当前没有命中的历史聊天日期。'
    : chatHits.map((item) => `- ${item.date}（命中 ${item.matchedCount} 条）`).join('\n')

  const observationSummary = todayObservations.length === 0
    ? '当前没有今日观察补充。'
    : todayObservations.map((item) => `- [${item.type}] ${item.title}`).join('\n')

  return {
    memorySummary,
    topicSummary,
    chatSummary,
    observationSummary,
    primaryIdentityProfile,
    selectedPages,
    selectedTopics,
    chatHits,
    todayObservations
  }
}
