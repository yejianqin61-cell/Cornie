import { createMemoryWikiService, createTopicIndexStore } from '../memory-wiki/index.js'
import { createChatlogService } from '../chatlog/service.js'
import { createObservationService } from '../observation/service.js'

const DEFAULT_MEMORY_PAGE_LIMIT = 4
const DEFAULT_TOPIC_LIMIT = 4
const DEFAULT_MESSAGE_HIT_LIMIT = 3
const IDENTITY_PROFILE_PAGE_TYPE = 'identity_profile'
const IDENTITY_PERSON_PAGE_TYPE = 'identity_person'
const IDENTITY_PREFERENCE_PAGE_TYPE = 'identity_preference'
const IDENTITY_TRAIT_PAGE_TYPE = 'identity_trait'

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

function isIdentityPersonPage(page) {
  return normalizeString(page?.pageType) === IDENTITY_PERSON_PAGE_TYPE
}

function isIdentityPreferencePage(page) {
  return normalizeString(page?.pageType) === IDENTITY_PREFERENCE_PAGE_TYPE
}

function isIdentityTraitPage(page) {
  return normalizeString(page?.pageType) === IDENTITY_TRAIT_PAGE_TYPE
}

function getPageStableId(page) {
  return normalizeString(page?.pageId ?? page?.id)
}

function splitQueryTerms(normalizedQuery) {
  return normalizeString(normalizedQuery)
    .toLowerCase()
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function pageMatchesQuery(page, normalizedQuery) {
  if (!normalizedQuery) return false

  const haystack = [
    page?.title,
    page?.summary,
    ...(Array.isArray(page?.aliases) ? page.aliases : [])
  ]
    .map((item) => normalizeString(item).toLowerCase())
    .filter(Boolean)
    .join(' ')

  return haystack.includes(normalizedQuery)
}

function pageMatchesAnyKeyword(page, queryTerms) {
  if (!Array.isArray(queryTerms) || queryTerms.length === 0) return false

  const haystack = [
    page?.title,
    page?.summary,
    page?.preferenceType,
    page?.stance,
    ...(Array.isArray(page?.aliases) ? page.aliases : []),
    ...(Array.isArray(page?.triggerKeywords) ? page.triggerKeywords : [])
  ]
    .map((item) => normalizeString(item).toLowerCase())
    .filter(Boolean)
    .join(' ')

  return queryTerms.some((term) => haystack.includes(term))
}

function traitMatchesEmotionalScene(page, queryTerms) {
  if (!Array.isArray(queryTerms) || queryTerms.length === 0) return false

  const emotionalTerms = new Set([
    '累', '难过', '焦虑', '紧张', '压力', '崩溃', '痛苦', '伤心', '情绪', '安慰',
    '关系', '初恋', '失恋', '回忆', '喜欢', '讨厌', '害怕', '孤独', '疲惫', '委屈'
  ])
  const queryHasEmotionalTerm = queryTerms.some((item) => emotionalTerms.has(item))
  if (!queryHasEmotionalTerm) {
    return false
  }

  const haystack = [
    page?.title,
    page?.summary,
    page?.traitType,
    page?.traitSummary,
    ...(Array.isArray(page?.aliases) ? page.aliases : []),
    ...(Array.isArray(page?.triggerKeywords) ? page.triggerKeywords : [])
  ]
    .map((item) => normalizeString(item).toLowerCase())
    .filter(Boolean)
    .join(' ')

  return queryTerms.some((term) => haystack.includes(term)) || queryHasEmotionalTerm
}

function comparePages(a, b, { normalizedQuery = '', queryTerms = [] } = {}) {
  const identityTraitQueryHitA = isIdentityTraitPage(a) && traitMatchesEmotionalScene(a, queryTerms) ? 1 : 0
  const identityTraitQueryHitB = isIdentityTraitPage(b) && traitMatchesEmotionalScene(b, queryTerms) ? 1 : 0
  if (identityTraitQueryHitA !== identityTraitQueryHitB) {
    return identityTraitQueryHitB - identityTraitQueryHitA
  }

  const identityPreferenceQueryHitA = isIdentityPreferencePage(a) && pageMatchesAnyKeyword(a, queryTerms) ? 1 : 0
  const identityPreferenceQueryHitB = isIdentityPreferencePage(b) && pageMatchesAnyKeyword(b, queryTerms) ? 1 : 0
  if (identityPreferenceQueryHitA !== identityPreferenceQueryHitB) {
    return identityPreferenceQueryHitB - identityPreferenceQueryHitA
  }

  const identityPersonQueryHitA = isIdentityPersonPage(a) && pageMatchesQuery(a, normalizedQuery) ? 1 : 0
  const identityPersonQueryHitB = isIdentityPersonPage(b) && pageMatchesQuery(b, normalizedQuery) ? 1 : 0
  if (identityPersonQueryHitA !== identityPersonQueryHitB) {
    return identityPersonQueryHitB - identityPersonQueryHitA
  }

  const queryHitA = pageMatchesQuery(a, normalizedQuery) ? 1 : 0
  const queryHitB = pageMatchesQuery(b, normalizedQuery) ? 1 : 0
  if (queryHitA !== queryHitB) {
    return queryHitB - queryHitA
  }

  return scorePage(b) - scorePage(a) || String(a.title).localeCompare(String(b.title), 'zh-CN')
}

function selectPrimaryIdentityProfile(pages) {
  const identityPages = pages.filter(isIdentityProfilePage)
  if (identityPages.length === 0) {
    return null
  }

  return [...identityPages].sort((a, b) => comparePages(a, b))[0] ?? null
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

function buildIdentityPreferenceSummaryLine(page) {
  const preferenceType = normalizeString(page.preferenceType) || '未分类'
  const stance = normalizeString(page.stance) || '未标注立场'
  const stabilityLevel = normalizeString(page.stabilityLevel) || 'medium'
  const summary = normalizeString(page.summary) || '暂无偏好摘要'
  return `- [preference/${preferenceType}/${stabilityLevel}] ${page.title}: ${stance}；${summary}`
}

function buildIdentityTraitSummaryLine(page) {
  const traitType = normalizeString(page.traitType) || '未分类'
  const confidenceLevel = normalizeString(page.confidenceLevel) || 'low'
  const stabilityLevel = normalizeString(page.stabilityLevel) || 'low'
  const summary = normalizeString(page.traitSummary) || normalizeString(page.summary) || '暂无侧写摘要'
  return `- [trait/${traitType}/${confidenceLevel}/${stabilityLevel}] ${page.title}: ${summary}`
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
  const normalizedQuery = normalizeString(query).toLowerCase()
  const queryTerms = splitQueryTerms(normalizedQuery)

  const pageSummaries = await memoryWiki.listSummaries({ status: 'active' })
  const primaryIdentityProfile = selectPrimaryIdentityProfile(pageSummaries)
  const matchedPreferencePages = queryTerms.length === 0
    ? []
    : pageSummaries
        .filter(isIdentityPreferencePage)
        .filter((page) => pageMatchesAnyKeyword(page, queryTerms))
        .sort((a, b) => comparePages(a, b, { normalizedQuery, queryTerms }))
  const matchedTraitPages = queryTerms.length === 0
    ? []
    : pageSummaries
        .filter((page) => isIdentityTraitPage(page) && page.status !== 'archived')
        .filter((page) => traitMatchesEmotionalScene(page, queryTerms))
        .sort((a, b) => comparePages(a, b, { normalizedQuery, queryTerms }))

  const matchedPreferenceIds = new Set(matchedPreferencePages.map((item) => getPageStableId(item)).filter(Boolean))
  const matchedTraitIds = new Set(matchedTraitPages.map((item) => getPageStableId(item)).filter(Boolean))
  const otherPages = [...pageSummaries]
    .filter((page) => !primaryIdentityProfile || getPageStableId(page) !== getPageStableId(primaryIdentityProfile))
    .filter((page) => !matchedPreferenceIds.has(getPageStableId(page)))
    .filter((page) => !matchedTraitIds.has(getPageStableId(page)))
    .sort((a, b) => comparePages(a, b, { normalizedQuery, queryTerms }))

  const selectedPages = [
    ...(primaryIdentityProfile ? [primaryIdentityProfile] : []),
    ...matchedPreferencePages,
    ...matchedTraitPages,
    ...otherPages
  ].slice(0, pageLimit)

  const topics = await topicIndex.list()
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
  const todayObservations = observation.listTodayForWikiRecall(date)

  const memorySummaryLines = []
  if (primaryIdentityProfile) {
    memorySummaryLines.push(buildIdentityProfileSummaryLine(primaryIdentityProfile))
  }

  memorySummaryLines.push(
    ...selectedPages
      .filter((page) => !primaryIdentityProfile || getPageStableId(page) !== getPageStableId(primaryIdentityProfile))
      .map((page) => {
        if (isIdentityPreferencePage(page)) return buildIdentityPreferenceSummaryLine(page)
        if (isIdentityTraitPage(page)) return buildIdentityTraitSummaryLine(page)
        return buildPageSummaryLine(page)
      })
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
