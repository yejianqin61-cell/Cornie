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

function isStableImportantPersonPage(page) {
  return (
    isIdentityPersonPage(page) &&
    normalizeString(page?.importance).toLowerCase() === 'critical' &&
    page?.ownerConfirmed === true
  )
}

function splitQueryTerms(normalizedQuery) {
  return normalizeString(normalizedQuery)
    .toLowerCase()
    .split(/[\s,.;:!?，。；：！？、()（）[\]【】'"“”‘’/\\|]+/)
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
    page?.personName,
    page?.relationshipToUser,
    page?.roleSummary,
    page?.personalitySummary,
    page?.meaningToUser,
    page?.sharedExperienceSummary,
    page?.timelineSummary,
    page?.firstKnownPeriod,
    ...(Array.isArray(page?.aliases) ? page.aliases : [])
  ]
    .map((item) => normalizeString(item).toLowerCase())
    .filter(Boolean)
    .join(' ')

  return haystack.includes(normalizedQuery)
}

function pageMatchesAnyKeyword(page, queryTerms) {
  if (!Array.isArray(queryTerms) || queryTerms.length === 0) return false

  const keywords = [
    page?.title,
    page?.summary,
    page?.preferenceType,
    page?.stance,
    ...(Array.isArray(page?.aliases) ? page.aliases : []),
    ...(Array.isArray(page?.triggerKeywords) ? page.triggerKeywords : [])
  ]
    .map((item) => normalizeString(item).toLowerCase())
    .filter(Boolean)

  return queryTerms.some((term) =>
    keywords.some((keyword) => keyword.includes(term) || term.includes(keyword))
  )
}

function personMatchesQuery(page, normalizedQuery, queryTerms) {
  if (pageMatchesQuery(page, normalizedQuery)) {
    return true
  }

  const directCandidates = [
    page?.title,
    page?.personName,
    page?.relationshipToUser,
    ...(Array.isArray(page?.aliases) ? page.aliases : [])
  ]
    .map((item) => normalizeString(item).toLowerCase())
    .filter(Boolean)

  if (normalizedQuery && directCandidates.some((item) => normalizedQuery.includes(item))) {
    return true
  }

  if (!Array.isArray(queryTerms) || queryTerms.length === 0) return false

  const haystack = [
    page?.title,
    page?.summary,
    page?.personName,
    page?.relationshipToUser,
    page?.roleSummary,
    page?.personalitySummary,
    page?.meaningToUser,
    page?.sharedExperienceSummary,
    page?.timelineSummary,
    page?.firstKnownPeriod,
    ...(Array.isArray(page?.aliases) ? page.aliases : [])
  ]
    .map((item) => normalizeString(item).toLowerCase())
    .filter(Boolean)
    .join(' ')

  return queryTerms.some((term) =>
    haystack.includes(term) ||
    term.split(/[\s,.;:!?，。；：！？、()（）[\]【】'"“”‘’/\\|]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .some((item) => haystack.includes(item) || item.includes(haystack))
  )
}

function traitMatchesEmotionalScene(page, queryTerms) {
  if (!Array.isArray(queryTerms) || queryTerms.length === 0) return false

  const emotionalTerms = new Set([
    '累', '难过', '焦虑', '紧张', '压力', '崩溃', '痛苦', '伤心', '情绪', '安慰',
    '关系', '初恋', '失恋', '回忆', '喜欢', '讨厌', '害怕', '孤独', '疲惫', '委屈'
  ])
  const queryHasEmotionalTerm = queryTerms.some((item) =>
    Array.from(emotionalTerms).some((term) => item.includes(term) || term.includes(item))
  )
  if (!queryHasEmotionalTerm) {
    return false
  }

  const keywords = [
    page?.title,
    page?.summary,
    page?.traitType,
    page?.traitSummary,
    ...(Array.isArray(page?.aliases) ? page.aliases : []),
    ...(Array.isArray(page?.triggerKeywords) ? page.triggerKeywords : [])
  ]
    .map((item) => normalizeString(item).toLowerCase())
    .filter(Boolean)

  return queryTerms.some((term) =>
    keywords.some((keyword) => keyword.includes(term) || term.includes(keyword))
  )
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

  const identityPersonQueryHitA = isIdentityPersonPage(a) && personMatchesQuery(a, normalizedQuery, queryTerms) ? 1 : 0
  const identityPersonQueryHitB = isIdentityPersonPage(b) && personMatchesQuery(b, normalizedQuery, queryTerms) ? 1 : 0
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

// 451：L0 画像卡 + L1 目录条目的"三信号"（摘要 + 重要性 + 最近提及/更新时间）。
// 449 结论：四类注入侧规则降级为目录排序信号；画像卡扩展字段（压力/沟通）以 ownerConfirmed 为可信度门控，
// 不再用词表决定"是否注入"（字段级注入改由钻取决定，见 452/453）。
function buildProfileCardLine(page) {
  const userName = normalizeString(page.userName) || normalizeString(page.title) || '未命名用户'
  const preferredName = normalizeString(page.preferredName)
  const relationship = normalizeString(page.cornieRelationship)
  const identitySummary = normalizeString(page.identitySummary) || normalizeString(page.summary)
  const lifeStageSummary = normalizeString(page.lifeStageSummary)
  const currentFocus = normalizeString(page.currentFocus)

  const parts = [
    `名字：${userName}`,
    preferredName && `称呼：${preferredName}`,
    relationship && `关系：${relationship}`,
    identitySummary,
    lifeStageSummary,
    currentFocus && `当前关注：${currentFocus}`
  ].filter(Boolean)

  if (page.ownerConfirmed === true) {
    const stressors = normalizeString(page.stressors)
    const communicationPreference = normalizeString(page.communicationPreference)
    if (stressors) parts.push(`压力：${stressors}`)
    if (communicationPreference) parts.push(`沟通偏好：${communicationPreference}`)
  }

  return `- [identity] ${userName}：${parts.join('；') || '暂无主身份摘要'}`
}

function buildDirectoryLine(page) {
  const pageType = normalizeString(page.pageType) || 'page'
  const importance = normalizeString(page.importance) || 'medium'
  const summary = normalizeString(page.summary) || '暂无摘要'
  const timeSignal =
    normalizeString(page.lastMentionedAt)?.slice(0, 10) ||
    normalizeString(page.lastUpdatedAt)?.slice(0, 10) ||
    ''
  return `- [${pageType}/${importance}] ${page.title}：${summary}${timeSignal ? ` · ${timeSignal}` : ''}`
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
  const chatlog = createChatlogService(store)
  const observation = createObservationService(store)
  const normalizedQuery = normalizeString(query).toLowerCase()
  const queryTerms = splitQueryTerms(normalizedQuery)

  try {
    const memoryWiki = await createMemoryWikiService({ baseDir })
    const topicIndex = await createTopicIndexStore(baseDir)

    const activePageSummaries = await memoryWiki.listSummaries({ status: 'active' })
    const reviewTraitSummaries = await memoryWiki.listSummaries({ pageType: IDENTITY_TRAIT_PAGE_TYPE, status: 'review' })
    const pageSummaries = [
      ...activePageSummaries,
      ...reviewTraitSummaries.filter((item) => normalizeString(item?.pageId))
    ]

    const primaryIdentityProfile = selectPrimaryIdentityProfile(activePageSummaries)
    const primaryId = primaryIdentityProfile ? getPageStableId(primaryIdentityProfile) : ''

    // 451：L0 = 画像卡 + 已确认重要人物；L1 = 其余页面按"重要性 + ownerConfirmed + 摘要 + 查询命中"排序取 top-N。
    // 449：词表仅参与排序，不再充当"是否注入字段/是否展示页面"的门控（字段级注入改由钻取决定）。
    const stablePersonPages = pageSummaries
      .filter((page) => isStableImportantPersonPage(page))
      .sort((a, b) => comparePages(a, b, { normalizedQuery, queryTerms }))
    const stablePersonIds = new Set(stablePersonPages.map((item) => getPageStableId(item)).filter(Boolean))

    const l1Pages = pageSummaries
      .filter((page) => getPageStableId(page) !== primaryId)
      .filter((page) => !stablePersonIds.has(getPageStableId(page)))
      .sort((a, b) => comparePages(a, b, { normalizedQuery, queryTerms }))
      .slice(0, pageLimit)

    const selectedPages = [
      ...(primaryIdentityProfile ? [primaryIdentityProfile] : []),
      ...stablePersonPages,
      ...l1Pages
    ]

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
      memorySummaryLines.push(buildProfileCardLine(primaryIdentityProfile))
    }
    memorySummaryLines.push(...stablePersonPages.map(buildDirectoryLine))
    memorySummaryLines.push(...l1Pages.map(buildDirectoryLine))

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
  } catch (error) {
    console.error('Wiki context fallback activated:', error)
    const chatHits = normalizedQuery
      ? chatlog.searchDatesByKeyword(normalizedQuery).entries.slice(0, DEFAULT_MESSAGE_HIT_LIMIT)
      : []
    const todayObservations = observation.listTodayForWikiRecall(date)

    return {
      memorySummary: '长期记忆暂时读取失败，本轮先不注入记忆页面。',
      topicSummary: '主题索引暂时读取失败。',
      chatSummary: chatHits.length === 0
        ? '当前没有命中的历史聊天日期。'
        : chatHits.map((item) => `- ${item.date}（命中 ${item.matchedCount} 条）`).join('\n'),
      observationSummary: todayObservations.length === 0
        ? '当前没有今日观察补充。'
        : todayObservations.map((item) => `- [${item.type}] ${item.title}`).join('\n'),
      primaryIdentityProfile: null,
      selectedPages: [],
      selectedTopics: [],
      chatHits,
      todayObservations
    }
  }
}
