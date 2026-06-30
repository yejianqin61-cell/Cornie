import { createMemoryWikiService, createTopicIndexStore } from '../memory-wiki/index.js'
import { createChatlogService } from '../chatlog/service.js'
import { createObservationService } from '../observation/service.js'
import { PROMPT_LOADING_POLICY } from './promptLoadingPolicy.js'

const DEFAULT_MEMORY_PAGE_LIMIT = PROMPT_LOADING_POLICY.memoryPageLimit
const DEFAULT_TOPIC_LIMIT = PROMPT_LOADING_POLICY.topicLimit
const DEFAULT_MESSAGE_HIT_LIMIT = PROMPT_LOADING_POLICY.chatRecallDateLimit
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

function isHighPriorityPage(page) {
  return ['critical', 'high'].includes(normalizeString(page?.importance).toLowerCase())
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
    page?.identitySummary,
    page?.lifeStageSummary,
    page?.currentFocus,
    page?.stressors,
    page?.communicationPreference,
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

function identityProfileNeedsExtendedDetails(page, normalizedQuery = '', queryTerms = []) {
  const queryText = normalizeString(normalizedQuery).toLowerCase()
  if (!queryText && (!Array.isArray(queryTerms) || queryTerms.length === 0)) {
    return false
  }

  const stressorHaystack = [
    page?.currentFocus,
    page?.stressors,
    page?.identitySummary,
    page?.lifeStageSummary
  ]
    .map((item) => normalizeString(item).toLowerCase())
    .filter(Boolean)
    .join(' ')

  const communicationHaystack = [
    page?.communicationPreference,
    page?.identitySummary,
    page?.summary
  ]
    .map((item) => normalizeString(item).toLowerCase())
    .filter(Boolean)
    .join(' ')

  const stressorTerms = ['压力', '焦虑', '累', '疲惫', '崩溃', '难', '熬夜', '求职', '考试', '项目']
  const communicationTerms = ['温柔', '陪伴', '安慰', '记住', '上下文', '沟通', '说话', '克制', '陪我']
  if (
    (stressorHaystack && stressorTerms.some((term) => queryText.includes(term))) ||
    (communicationHaystack && communicationTerms.some((term) => queryText.includes(term)))
  ) {
    return true
  }

  const haystack = [stressorHaystack, communicationHaystack].filter(Boolean).join(' ')
  if (!haystack || !Array.isArray(queryTerms) || queryTerms.length === 0) {
    return false
  }

  return queryTerms.some((term) => haystack.includes(term))
}

function buildIdentityProfileSummaryLine(page, normalizedQuery = '', queryTerms = []) {
  const userName = normalizeString(page.userName) || normalizeString(page.title) || '未命名用户'
  const preferredName = normalizeString(page.preferredName)
  const relationship = normalizeString(page.cornieRelationship)
  const identitySummary = normalizeString(page.identitySummary) || normalizeString(page.summary)
  const lifeStageSummary = normalizeString(page.lifeStageSummary)
  const currentFocus = normalizeString(page.currentFocus)
  const stressors = normalizeString(page.stressors)
  const communicationPreference = normalizeString(page.communicationPreference)
  const includeExtendedDetails = identityProfileNeedsExtendedDetails(page, normalizedQuery, queryTerms)

  const parts = [
    `名字：${userName}`,
    preferredName && `称呼：${preferredName}`,
    relationship && `关系：${relationship}`,
    identitySummary,
    lifeStageSummary,
    currentFocus && `当前关注：${currentFocus}`,
    includeExtendedDetails && stressors && `压力：${stressors}`,
    includeExtendedDetails && communicationPreference && `沟通偏好：${communicationPreference}`
  ].filter(Boolean)

  return `- [identity] ${userName}: ${parts.join('；') || '暂无主身份摘要'}`
}

function buildIdentityPreferenceSummaryLine(page) {
  const preferenceType = normalizeString(page.preferenceType) || '未分类'
  const stance = normalizeString(page.stance) || '未标注立场'
  const stabilityLevel = normalizeString(page.stabilityLevel) || 'medium'
  const summary = normalizeString(page.summary) || '暂无偏好摘要'
  return `- [preference/${preferenceType}/${stabilityLevel}] ${page.title}: ${stance}；${summary}`
}

function personNeedsRiskyDetails(page, normalizedQuery = '', queryTerms = []) {
  if (page?.ownerConfirmed === true) {
    return true
  }

  const queryText = normalizeString(normalizedQuery).toLowerCase()
  if (!queryText && (!Array.isArray(queryTerms) || queryTerms.length === 0)) {
    return false
  }

  const riskyTerms = [
    '重要', '很重要', '意义', '回忆', '想念', '怀念', '初恋', '前任', '关系', '感情',
    '喜欢', '爱', '温柔', '害羞', '内向', '性格', '为什么', '怎么看', '意味着'
  ]
  if (riskyTerms.some((item) => queryText.includes(item))) {
    return true
  }

  if (!Array.isArray(queryTerms) || queryTerms.length === 0) {
    return false
  }

  return queryTerms.some((term) => riskyTerms.includes(term))
}

function buildIdentityPersonSummaryLine(page, normalizedQuery = '', queryTerms = []) {
  const personName = normalizeString(page.personName) || normalizeString(page.title) || '未命名人物'
  const relationshipToUser = normalizeString(page.relationshipToUser)
  const roleSummary = normalizeString(page.roleSummary)
  const personalitySummary = normalizeString(page.personalitySummary)
  const meaningToUser = normalizeString(page.meaningToUser)
  const sharedExperienceSummary = normalizeString(page.sharedExperienceSummary) || normalizeString(page.summary)
  const firstKnownPeriod = normalizeString(page.firstKnownPeriod)
  const timelineSummary = normalizeString(page.timelineSummary)
  const includeRiskyDetails = personNeedsRiskyDetails(page, normalizedQuery, queryTerms)

  return `- [person] ${personName}: ${[
    relationshipToUser && `关系：${relationshipToUser}`,
    firstKnownPeriod && `首次已知：${firstKnownPeriod}`,
    roleSummary,
    includeRiskyDetails && personalitySummary,
    includeRiskyDetails && meaningToUser && `意义：${meaningToUser}`,
    sharedExperienceSummary,
    timelineSummary && `时间线：${timelineSummary}`
  ].filter(Boolean).join('；') || '暂无人物摘要'}`
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

  const activePageSummaries = await memoryWiki.listSummaries({ status: 'active' })
  const reviewTraitSummaries = await memoryWiki.listSummaries({ pageType: IDENTITY_TRAIT_PAGE_TYPE, status: 'review' })
  const pageSummaries = [
    ...activePageSummaries,
    ...reviewTraitSummaries.filter((item) => normalizeString(item?.pageId))
  ]

  const primaryIdentityProfile = selectPrimaryIdentityProfile(activePageSummaries)
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
    .filter((page) => {
      if (queryTerms.length === 0 && isIdentityTraitPage(page) && normalizeString(page.status) === 'review') {
        return false
      }
      return true
    })
    .sort((a, b) => comparePages(a, b, { normalizedQuery, queryTerms }))

  const stablePersonPages = queryTerms.length === 0
    ? otherPages.filter((page) => isIdentityPersonPage(page) && isHighPriorityPage(page))
    : []
  const stablePersonIds = new Set(stablePersonPages.map((item) => getPageStableId(item)).filter(Boolean))
  const remainingPages = otherPages
    .filter((page) => !stablePersonIds.has(getPageStableId(page)))
    .filter((page) => {
      if (queryTerms.length === 0 && isIdentityPreferencePage(page)) {
        return false
      }
      return true
    })

  const selectedPages = [
    ...(primaryIdentityProfile ? [primaryIdentityProfile] : []),
    ...stablePersonPages,
    ...matchedPreferencePages,
    ...matchedTraitPages,
    ...remainingPages
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
    memorySummaryLines.push(buildIdentityProfileSummaryLine(primaryIdentityProfile, normalizedQuery, queryTerms))
  }

  memorySummaryLines.push(
    ...selectedPages
      .filter((page) => !primaryIdentityProfile || getPageStableId(page) !== getPageStableId(primaryIdentityProfile))
      .filter((page) => {
        if (queryTerms.length === 0 && isIdentityPreferencePage(page)) {
          return false
        }
        return true
      })
      .map((page) => {
        if (isIdentityPersonPage(page)) return buildIdentityPersonSummaryLine(page, normalizedQuery, queryTerms)
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
