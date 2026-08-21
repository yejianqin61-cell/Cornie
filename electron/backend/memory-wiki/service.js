import { createMemoryWikiStorage } from './storage.js'
import { createMemoryWikiVersionStore } from './versionStore.js'
import { createMemoryWikiAuditStore } from './audit.js'
import { createMemoryWikiInspector } from './inspector.js'
import { createTopicIndexStore } from './topicIndex.js'
import { createMemoryWikiGovernanceStore } from './governanceStore.js'
import { applyObservationWikiUpgradeRequest } from '../observation/wikiUpgradeApply.js'
import { normalizePageStatus } from './pageModel.js'
import { getMessagesByDate, getObservationLog } from '../../db.js'

const IDENTITY_PROFILE_PAGE_TYPE = 'identity_profile'
const IDENTITY_PERSON_PAGE_TYPE = 'identity_person'
const IDENTITY_PREFERENCE_PAGE_TYPE = 'identity_preference'
const IDENTITY_TRAIT_PAGE_TYPE = 'identity_trait'

function normalizeString(value) {
  return String(value ?? '').trim()
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => normalizeString(item)).filter(Boolean)
}

function normalizeInteger(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function isIdentityPreferencePageInput(input) {
  return normalizeString(input?.pageType ?? input?.page_type) === IDENTITY_PREFERENCE_PAGE_TYPE
}

function isIdentityTraitPageInput(input) {
  return normalizeString(input?.pageType ?? input?.page_type) === IDENTITY_TRAIT_PAGE_TYPE
}

function isIdentityProfilePageInput(input) {
  return normalizeString(input?.pageType ?? input?.page_type) === IDENTITY_PROFILE_PAGE_TYPE
}

function isIdentityPersonPageInput(input) {
  return normalizeString(input?.pageType ?? input?.page_type) === IDENTITY_PERSON_PAGE_TYPE
}

function buildIdentityProfileSummary(input) {
  const userName = normalizeString(input.userName ?? input.user_name) || normalizeString(input.title)
  const preferredName = normalizeString(input.preferredName ?? input.preferred_name)
  const cornieRelationship = normalizeString(input.cornieRelationship ?? input.cornie_relationship)
  const identitySummary = normalizeString(input.identitySummary ?? input.identity_summary)
  const lifeStageSummary = normalizeString(input.lifeStageSummary ?? input.life_stage_summary)
  const currentFocus = normalizeString(input.currentFocus ?? input.current_focus)

  return [
    userName && `名字：${userName}`,
    preferredName && `称呼：${preferredName}`,
    cornieRelationship && `关系：${cornieRelationship}`,
    identitySummary,
    lifeStageSummary,
    currentFocus && `当前关注：${currentFocus}`
  ]
    .filter(Boolean)
    .join('；')
}

function buildIdentityProfileBody(input) {
  const userName = normalizeString(input.userName ?? input.user_name) || normalizeString(input.title) || '待确认'
  const preferredName = normalizeString(input.preferredName ?? input.preferred_name) || '待确认'
  const cornieRelationship = normalizeString(input.cornieRelationship ?? input.cornie_relationship) || '待确认'
  const identitySummary = normalizeString(input.identitySummary ?? input.identity_summary) || '待补充'
  const lifeStageSummary = normalizeString(input.lifeStageSummary ?? input.life_stage_summary) || '待补充'
  const currentFocus = normalizeString(input.currentFocus ?? input.current_focus) || '待补充'
  const stressors = normalizeString(input.stressors) || '待补充'
  const communicationPreference = normalizeString(input.communicationPreference ?? input.communication_preference) || '待补充'

  return [
    '## 基本身份',
    `- 用户名字：${userName}`,
    `- 偏好称呼：${preferredName}`,
    '',
    '## 与 Cornie 的关系',
    `- 关系定义：${cornieRelationship}`,
    '',
    '## 当前阶段画像',
    `- 身份摘要：${identitySummary}`,
    `- 阶段概况：${lifeStageSummary}`,
    '',
    '## 长期关注点',
    `- 当前关注：${currentFocus}`,
    `- 主要压力：${stressors}`,
    '',
    '## 沟通与陪伴偏好',
    `- 沟通偏好：${communicationPreference}`
  ].join('\n')
}

function buildIdentityPersonSummary(input) {
  const personName = normalizeString(input.personName ?? input.person_name) || normalizeString(input.title)
  const relationshipToUser = normalizeString(input.relationshipToUser ?? input.relationship_to_user)
  const roleSummary = normalizeString(input.roleSummary ?? input.role_summary)
  const personalitySummary = normalizeString(input.personalitySummary ?? input.personality_summary)
  const meaningToUser = normalizeString(input.meaningToUser ?? input.meaning_to_user)
  const sharedExperienceSummary = normalizeString(input.sharedExperienceSummary ?? input.shared_experience_summary)

  return [
    personName && `人物：${personName}`,
    relationshipToUser && `关系：${relationshipToUser}`,
    roleSummary,
    personalitySummary,
    meaningToUser,
    sharedExperienceSummary
  ]
    .filter(Boolean)
    .join('；')
}

function buildIdentityPersonBody(input) {
  const personName = normalizeString(input.personName ?? input.person_name) || normalizeString(input.title) || '待确认'
  const relationshipToUser = normalizeString(input.relationshipToUser ?? input.relationship_to_user) || '待补充'
  const roleSummary = normalizeString(input.roleSummary ?? input.role_summary) || '待补充'
  const personalitySummary = normalizeString(input.personalitySummary ?? input.personality_summary) || '待补充'
  const meaningToUser = normalizeString(input.meaningToUser ?? input.meaning_to_user) || '待补充'
  const sharedExperienceSummary = normalizeString(input.sharedExperienceSummary ?? input.shared_experience_summary) || '待补充'
  const emotionalWeight = normalizeString(input.emotionalWeight ?? input.emotional_weight) || '待补充'
  const timelineSummary = normalizeString(input.timelineSummary ?? input.timeline_summary) || '待补充'
  const firstKnownPeriod = normalizeString(input.firstKnownPeriod ?? input.first_known_period) || '待补充'

  return [
    '## 关系',
    `- 人物名字：${personName}`,
    `- 与用户关系：${relationshipToUser}`,
    '',
    '## 身份',
    `- 身份摘要：${roleSummary}`,
    `- 首次已知阶段：${firstKnownPeriod}`,
    '',
    '## 性格',
    `- 性格摘要：${personalitySummary}`,
    `- 情感权重：${emotionalWeight}`,
    '',
    '## 对用户的意义',
    `- 意义摘要：${meaningToUser}`,
    '',
    '## 和用户的共同经历',
    `- 共同经历：${sharedExperienceSummary}`,
    `- 时间线：${timelineSummary}`
  ].join('\n')
}

function buildIdentityPreferenceSummary(input) {
  const title = normalizeString(input.title)
  const stance = normalizeString(input.stance)
  const preferenceType = normalizeString(input.preferenceType ?? input.preference_type)
  const stabilityLevel = normalizeString(input.stabilityLevel ?? input.stability_level)
  const segments = [stance, preferenceType, title].filter(Boolean)
  if (segments.length === 0) {
    return ''
  }
  const summary = segments.join(' / ')
  return stabilityLevel ? `${summary}（稳定性：${stabilityLevel}）` : summary
}

function buildIdentityPreferenceBody(input) {
  const title = normalizeString(input.title)
  const stance = normalizeString(input.stance) || '未标注'
  const preferenceType = normalizeString(input.preferenceType ?? input.preference_type) || '未分类'
  const stabilityLevel = normalizeString(input.stabilityLevel ?? input.stability_level) || 'medium'
  const summary = normalizeString(input.summary) || buildIdentityPreferenceSummary(input) || '暂无结论'
  const evidenceCount = normalizeInteger(input.evidenceCount ?? input.evidence_count)
  const lastConfirmedAt = normalizeString(input.lastConfirmedAt ?? input.last_confirmed_at) || '待确认'
  const keywords = normalizeStringArray(input.triggerKeywords ?? input.trigger_keywords)

  const lines = [
    '## 偏好结论',
    `- 标题：${title || '未命名偏好'}`,
    `- 立场：${stance}`,
    `- 类型：${preferenceType}`,
    `- 摘要：${summary}`,
    '',
    '## 稳定性与确认',
    `- 稳定性：${stabilityLevel}`,
    `- 证据计数：${evidenceCount}`,
    `- 最近确认：${lastConfirmedAt}`,
    '',
    '## 触发关键词',
    ...(keywords.length > 0 ? keywords.map((item) => `- ${item}`) : ['- 暂无']),
    '',
    '## 使用说明',
    '- 仅在当前话题与该偏好直接相关时注入对话 prompt。'
  ]

  return lines.join('\n')
}

function buildIdentityTraitSummary(input) {
  const title = normalizeString(input.title)
  const traitType = normalizeString(input.traitType ?? input.trait_type)
  const confidenceLevel = normalizeString(input.confidenceLevel ?? input.confidence_level)
  const stabilityLevel = normalizeString(input.stabilityLevel ?? input.stability_level)
  const segments = [traitType, title].filter(Boolean)
  if (segments.length === 0) {
    return ''
  }

  const suffix = [confidenceLevel && `置信度：${confidenceLevel}`, stabilityLevel && `稳定性：${stabilityLevel}`]
    .filter(Boolean)
    .join('，')
  return suffix ? `${segments.join(' / ')}（${suffix}）` : segments.join(' / ')
}

function buildIdentityTraitBody(input) {
  const title = normalizeString(input.title)
  const traitType = normalizeString(input.traitType ?? input.trait_type) || '未分类'
  const confidenceLevel = normalizeString(input.confidenceLevel ?? input.confidence_level) || 'low'
  const stabilityLevel = normalizeString(input.stabilityLevel ?? input.stability_level) || 'low'
  const traitSummary = normalizeString(input.traitSummary ?? input.trait_summary) || normalizeString(input.summary) || buildIdentityTraitSummary(input) || '暂无结论'
  const evidenceCount = normalizeInteger(input.evidenceCount ?? input.evidence_count)
  const ownerConfirmed = input.ownerConfirmed === true || input.owner_confirmed === true ? '是' : '否'
  const lastConfirmedAt = normalizeString(input.lastConfirmedAt ?? input.last_confirmed_at) || '待确认'
  const keywords = normalizeStringArray(input.triggerKeywords ?? input.trigger_keywords)

  const lines = [
    '## 特征倾向',
    `- 标题：${title || '未命名侧写'}`,
    `- 类型：${traitType}`,
    `- 侧写摘要：${traitSummary}`,
    '',
    '## 证据与置信',
    `- 置信度：${confidenceLevel}`,
    `- 稳定性：${stabilityLevel}`,
    `- 证据计数：${evidenceCount}`,
    `- 主人确认：${ownerConfirmed}`,
    `- 最近确认：${lastConfirmedAt}`,
    '',
    '## 触发关键词',
    ...(keywords.length > 0 ? keywords.map((item) => `- ${item}`) : ['- 暂无']),
    '',
    '## 使用注意',
    '- 这是一条倾向性侧写，不应在无关场景高频注入。'
  ]

  return lines.join('\n')
}

function shouldCreateTraitGovernanceCandidate(input) {
  if (!isIdentityTraitPageInput(input)) {
    return false
  }

  const ownerConfirmed = input.ownerConfirmed === true || input.owner_confirmed === true
  const evidenceCount = normalizeInteger(input.evidenceCount ?? input.evidence_count)
  const confidenceLevel = normalizeString(input.confidenceLevel ?? input.confidence_level).toLowerCase()
  return !ownerConfirmed || evidenceCount < 2 || !['medium', 'high'].includes(confidenceLevel)
}

function normalizeStructuredPageInput(input) {
  if (isIdentityProfilePageInput(input)) {
    const normalized = {
      ...input,
      userName: normalizeString(input.userName ?? input.user_name),
      preferredName: normalizeString(input.preferredName ?? input.preferred_name),
      cornieRelationship: normalizeString(input.cornieRelationship ?? input.cornie_relationship),
      identitySummary: normalizeString(input.identitySummary ?? input.identity_summary),
      lifeStageSummary: normalizeString(input.lifeStageSummary ?? input.life_stage_summary),
      currentFocus: normalizeString(input.currentFocus ?? input.current_focus),
      stressors: normalizeString(input.stressors),
      communicationPreference: normalizeString(input.communicationPreference ?? input.communication_preference)
    }

    if (!normalizeString(normalized.summary)) {
      normalized.summary = buildIdentityProfileSummary(normalized)
    }

    if (!normalizeString(normalized.body)) {
      normalized.body = buildIdentityProfileBody(normalized)
    }

    return normalized
  }

  if (isIdentityPersonPageInput(input)) {
    const normalized = {
      ...input,
      personName: normalizeString(input.personName ?? input.person_name),
      relationshipToUser: normalizeString(input.relationshipToUser ?? input.relationship_to_user),
      roleSummary: normalizeString(input.roleSummary ?? input.role_summary),
      personalitySummary: normalizeString(input.personalitySummary ?? input.personality_summary),
      meaningToUser: normalizeString(input.meaningToUser ?? input.meaning_to_user),
      sharedExperienceSummary: normalizeString(input.sharedExperienceSummary ?? input.shared_experience_summary),
      emotionalWeight: normalizeString(input.emotionalWeight ?? input.emotional_weight),
      timelineSummary: normalizeString(input.timelineSummary ?? input.timeline_summary),
      firstKnownPeriod: normalizeString(input.firstKnownPeriod ?? input.first_known_period)
    }

    if (!normalizeString(normalized.summary)) {
      normalized.summary = buildIdentityPersonSummary(normalized)
    }

    if (!normalizeString(normalized.body)) {
      normalized.body = buildIdentityPersonBody(normalized)
    }

    return normalized
  }

  if (isIdentityPreferencePageInput(input)) {
    const normalized = {
      ...input,
      preferenceType: normalizeString(input.preferenceType ?? input.preference_type),
      stance: normalizeString(input.stance),
      stabilityLevel: normalizeString(input.stabilityLevel ?? input.stability_level) || 'medium',
      evidenceCount: normalizeInteger(input.evidenceCount ?? input.evidence_count),
      lastConfirmedAt: normalizeString(input.lastConfirmedAt ?? input.last_confirmed_at),
      triggerKeywords: normalizeStringArray(input.triggerKeywords ?? input.trigger_keywords)
    }

    if (!normalizeString(normalized.summary)) {
      normalized.summary = buildIdentityPreferenceSummary(normalized)
    }

    if (!normalizeString(normalized.body)) {
      normalized.body = buildIdentityPreferenceBody(normalized)
    }

    return normalized
  }

  if (isIdentityTraitPageInput(input)) {
    const normalized = {
      ...input,
      traitType: normalizeString(input.traitType ?? input.trait_type),
      confidenceLevel: normalizeString(input.confidenceLevel ?? input.confidence_level) || 'low',
      stabilityLevel: normalizeString(input.stabilityLevel ?? input.stability_level) || 'low',
      traitSummary: normalizeString(input.traitSummary ?? input.trait_summary),
      evidenceCount: normalizeInteger(input.evidenceCount ?? input.evidence_count),
      lastConfirmedAt: normalizeString(input.lastConfirmedAt ?? input.last_confirmed_at),
      triggerKeywords: normalizeStringArray(input.triggerKeywords ?? input.trigger_keywords),
      status: normalizeString(input.status) || 'review'
    }

    if (!normalizeString(normalized.summary)) {
      normalized.summary = normalized.traitSummary || buildIdentityTraitSummary(normalized)
    }

    if (!normalizeString(normalized.body)) {
      normalized.body = buildIdentityTraitBody(normalized)
    }

    return normalized
  }

  return input
}

async function ensureIdentityTraitGovernanceCandidate(governanceStore, page) {
  if (!page || normalizeString(page.pageType) !== IDENTITY_TRAIT_PAGE_TYPE) {
    return
  }

  if (!shouldCreateTraitGovernanceCandidate(page)) {
    return
  }

  const existing = await governanceStore.list({
    requestType: 'identity_trait_review',
    queueSection: 'identity_trait_reviews'
  })
  const duplicated = existing.some((item) =>
    (item.status === 'pending' || item.status === 'deferred') &&
    Array.isArray(item.pageIds) &&
    item.pageIds.includes(page.pageId)
  )
  if (duplicated) {
    return
  }

  await governanceStore.create({
    requestType: 'identity_trait_review',
    triggerSource: 'page_write',
    queueSection: 'identity_trait_reviews',
    riskLevel: 'high',
    pageIds: [page.pageId],
    title: page.title || page.pageId,
    reason: 'Identity trait 页面仍缺少足够证据或主人确认，建议进入治理审核后再视为稳定长期记忆。',
    evidence: [
      {
        pageId: page.pageId,
        confidenceLevel: page.confidenceLevel,
        stabilityLevel: page.stabilityLevel,
        evidenceCount: page.evidenceCount,
        ownerConfirmed: page.ownerConfirmed
      }
    ],
    payload: {
      action: 'review_identity_trait',
      confidenceLevel: page.confidenceLevel,
      stabilityLevel: page.stabilityLevel
    }
  })
}

function summarizePage(page) {
  return {
    pageId: page.pageId,
    pageType: page.pageType,
    title: page.title,
    slug: page.slug,
    aliases: Array.isArray(page.aliases) ? page.aliases : [],
    summary: page.summary,
    status: page.status,
    importance: page.importance,
    ownerConfirmed: page.ownerConfirmed,
    userName: page.userName ?? '',
    preferredName: page.preferredName ?? '',
    cornieRelationship: page.cornieRelationship ?? '',
    identitySummary: page.identitySummary ?? '',
    lifeStageSummary: page.lifeStageSummary ?? '',
    currentFocus: page.currentFocus ?? '',
    stressors: page.stressors ?? '',
    communicationPreference: page.communicationPreference ?? '',
    personName: page.personName ?? '',
    relationshipToUser: page.relationshipToUser ?? '',
    roleSummary: page.roleSummary ?? '',
    personalitySummary: page.personalitySummary ?? '',
    meaningToUser: page.meaningToUser ?? '',
    sharedExperienceSummary: page.sharedExperienceSummary ?? '',
    emotionalWeight: page.emotionalWeight ?? '',
    timelineSummary: page.timelineSummary ?? '',
    firstKnownPeriod: page.firstKnownPeriod ?? '',
    preferenceType: page.preferenceType ?? '',
    stance: page.stance ?? '',
    stabilityLevel: page.stabilityLevel ?? '',
    traitType: page.traitType ?? '',
    confidenceLevel: page.confidenceLevel ?? '',
    traitSummary: page.traitSummary ?? '',
    evidenceCount: page.evidenceCount ?? 0,
    lastConfirmedAt: page.lastConfirmedAt ?? '',
    triggerKeywords: Array.isArray(page.triggerKeywords) ? page.triggerKeywords : [],
    relatedPageIds: Array.isArray(page.relatedPageIds) ? page.relatedPageIds : [],
    filePath: page.filePath,
    updatedAt: page.lastUpdatedAt
  }
}

function normalizeChatTraceItem(sourceRef, message) {
  return {
    kind: 'chat',
    date: sourceRef.date,
    messageId: sourceRef.messageId,
    role: sourceRef.role || message?.role || '',
    exists: Boolean(message),
    preview: message?.content ? String(message.content).slice(0, 120) : '',
    title: sourceRef.date ? `${sourceRef.date} 对话` : '聊天记录'
  }
}

function normalizeObservationTraceItem(sourceRef, observation) {
  return {
    kind: 'observation',
    date: sourceRef.date || observation?.date || '',
    observationId: sourceRef.observationId,
    type: sourceRef.type || observation?.type || '',
    title: observation?.title || sourceRef.title || '观察记录',
    exists: Boolean(observation),
    preview: observation?.content ? String(observation.content).slice(0, 120) : ''
  }
}

function parseSourceRefPair(value) {
  const text = normalizeString(value)
  const [date, refId] = text.split('#')
  return {
    date: normalizeString(date),
    refId: normalizeString(refId)
  }
}

function normalizeDateValue(value) {
  const normalized = normalizeString(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : ''
}

function buildPersonTimelineTrace({ page, chatSources, observationSources, relatedPages }) {
  if (normalizeString(page?.pageType) !== IDENTITY_PERSON_PAGE_TYPE) {
    return null
  }

  const chatDates = Array.from(
    new Set(chatSources.map((item) => normalizeDateValue(item?.date)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'zh-CN'))

  const observationDates = Array.from(
    new Set(observationSources.map((item) => normalizeDateValue(item?.date)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'zh-CN'))

  const timelineDates = Array.from(
    new Set([
      ...chatDates,
      ...observationDates,
      normalizeDateValue(page?.lastMentionedAt)
    ].filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'zh-CN'))

  const timeline = timelineDates.map((date) => ({
    date,
    hasChatSource: chatDates.includes(date),
    hasObservationSource: observationDates.includes(date)
  }))

  return {
    personName: normalizeString(page.personName) || normalizeString(page.title),
    relationshipToUser: normalizeString(page.relationshipToUser),
    chatDates,
    observationDates,
    timeline,
    relatedMemoryPages: relatedPages.map((item) => ({
      pageId: item.pageId,
      pageType: item.pageType,
      title: item.title,
      summary: item.summary
    }))
  }
}

function buildTopicTimelineTrace({ topic, chatSources, observationSources, relatedPages }) {
  const chatDates = Array.from(
    new Set(chatSources.map((item) => normalizeDateValue(item?.date)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'zh-CN'))

  const observationDates = Array.from(
    new Set(observationSources.map((item) => normalizeDateValue(item?.date)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'zh-CN'))

  const timelineDates = Array.from(
    new Set([
      ...chatDates,
      ...observationDates,
      ...(Array.isArray(topic?.dates) ? topic.dates.map((item) => normalizeDateValue(item)) : [])
    ].filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'zh-CN'))

  return {
    keyword: normalizeString(topic?.keyword),
    normalizedKey: normalizeString(topic?.normalizedKey),
    chatDates,
    observationDates,
    timeline: timelineDates.map((date) => ({
      date,
      hasChatSource: chatDates.includes(date),
      hasObservationSource: observationDates.includes(date)
    })),
    relatedMemoryPages: relatedPages.map((item) => ({
      pageId: item.pageId,
      pageType: item.pageType,
      title: item.title,
      summary: item.summary
    }))
  }
}

function buildGovernanceRequestFromBrokenLinkIssue(issue) {
  const pageIds = [issue.pageId, issue.relatedPageId].filter(Boolean)
  const topicKeys = [issue.normalizedKey].filter(Boolean)
  return {
    requestType: 'repair_suggestion',
    triggerSource: 'inspection',
    queueSection: 'repair_suggestions',
    riskLevel: 'high',
    pageIds,
    topicKeys,
    title: issue.issueType,
    reason: issue.suggestion?.reason || '巡检发现需要修复的问题',
    evidence: [issue],
    payload: issue.suggestion ?? {}
  }
}

function buildGovernanceRequestFromOrphanItem(item) {
  return {
    requestType: 'archive_candidate',
    triggerSource: 'inspection',
    queueSection: 'archive_candidates',
    riskLevel: 'high',
    pageIds: [item.pageId].filter(Boolean),
    topicKeys: [],
    title: item.title || item.pageId,
    reason: item.suggestion?.reason || '页面缺少来源与关联，可归档或补链',
    evidence: [item],
    payload: item.suggestion ?? {}
  }
}

export async function createMemoryWikiService({ baseDir, store } = {}) {
  if (!baseDir) {
    throw new Error('memory wiki service baseDir is required')
  }

  const storage = await createMemoryWikiStorage(baseDir)
  const versionStore = await createMemoryWikiVersionStore(baseDir)
  const auditStore = await createMemoryWikiAuditStore(baseDir)
  const topicIndex = await createTopicIndexStore(baseDir)
  const governanceStore = await createMemoryWikiGovernanceStore(baseDir)

  async function writeAudit(event) {
    return auditStore.append(event)
  }

  return {
    async create(input) {
      const page = await storage.createPage(normalizeStructuredPageInput(input))
      await ensureIdentityTraitGovernanceCandidate(governanceStore, page)
      await writeAudit({
        eventType: 'page_created',
        pageId: page.pageId,
        status: page.status,
        importance: page.importance,
        details: {
          pageType: page.pageType,
          title: page.title
        }
      })
      return page
    },

    async get(pageId) {
      if (!pageId) throw new Error('memory wiki pageId is required')
      return storage.readPageById(pageId)
    },

    async update(input) {
      if (!input?.pageId && !input?.page_id) {
        throw new Error('memory wiki pageId is required')
      }
      const pageId = input.pageId ?? input.page_id
      const existing = await storage.readPageById(pageId)
      if (!existing) {
        throw new Error(`memory wiki page not found: ${pageId}`)
      }
      const normalizedInput = normalizeStructuredPageInput(input)
      if (normalizedInput.pageType && normalizedInput.pageType !== existing.pageType) {
        throw new Error('memory wiki pageType cannot be changed on update; create a new page instead')
      }

      await versionStore.snapshotPage(existing, { reason: 'before_update' })
      const updated = await storage.updatePage({
        ...existing,
        ...normalizedInput,
        pageId: existing.pageId
      })
      await ensureIdentityTraitGovernanceCandidate(governanceStore, updated)
      await writeAudit({
        eventType: 'page_updated',
        pageId: existing.pageId,
        status: updated.status,
        importance: updated.importance,
        details: {
          title: updated.title
        }
      })
      return updated
    },

    async updateSummary(pageId, summary) {
      const existing = await this.get(pageId)
      if (!existing) throw new Error(`memory wiki page not found: ${pageId}`)
      return this.update({
        ...existing,
        pageId,
        summary
      })
    },

    async updateAliases(pageId, aliases) {
      const existing = await this.get(pageId)
      if (!existing) throw new Error(`memory wiki page not found: ${pageId}`)
      return this.update({
        ...existing,
        pageId,
        aliases: Array.isArray(aliases) ? aliases : []
      })
    },

    async setStatus(pageId, status) {
      const existing = await this.get(pageId)
      if (!existing) throw new Error(`memory wiki page not found: ${pageId}`)
      return this.update({
        ...existing,
        pageId,
        status: normalizePageStatus(status)
      })
    },

    async setImportance(pageId, importance) {
      const existing = await this.get(pageId)
      if (!existing) throw new Error(`memory wiki page not found: ${pageId}`)
      return this.update({
        ...existing,
        pageId,
        importance
      })
    },

    async setOwnerConfirmed(pageId, ownerConfirmed) {
      const existing = await this.get(pageId)
      if (!existing) throw new Error(`memory wiki page not found: ${pageId}`)
      return this.update({
        ...existing,
        pageId,
        ownerConfirmed: ownerConfirmed === true
      })
    },

    async addSourceRef(pageId, sourceRef) {
      const existing = await this.get(pageId)
      if (!existing) throw new Error(`memory wiki page not found: ${pageId}`)

      const serialized = JSON.stringify(sourceRef)
      const existingSerialized = new Set((existing.sourceRefs ?? []).map((item) => JSON.stringify(item)))
      if (existingSerialized.has(serialized)) {
        return existing
      }

      return this.update({
        ...existing,
        pageId,
        sourceRefs: [...(existing.sourceRefs ?? []), sourceRef]
      })
    },

    async archive(pageId) {
      return this.setStatus(pageId, 'archived')
    },

    async demote(pageId) {
      return this.setStatus(pageId, 'inactive')
    },

    async restore(pageId) {
      return this.setStatus(pageId, 'active')
    },

    async linkRelatedPages(pageId, relatedPageIds) {
      const existing = await this.get(pageId)
      if (!existing) throw new Error(`memory wiki page not found: ${pageId}`)

      const normalized = Array.from(
        new Set((Array.isArray(relatedPageIds) ? relatedPageIds : []).map((item) => String(item).trim()).filter(Boolean))
      ).filter((item) => item !== pageId)

      const missingRelatedPageIds = []
      for (const relatedPageId of normalized) {
        const relatedPage = await this.get(relatedPageId)
        if (!relatedPage) {
          missingRelatedPageIds.push(relatedPageId)
        }
      }

      if (missingRelatedPageIds.length > 0) {
        throw new Error(`memory wiki related pages not found: ${missingRelatedPageIds.join(', ')}`)
      }

      return this.update({
        ...existing,
        pageId,
        relatedPageIds: normalized
      })
    },

    async linkPageToTopic({ pageId, keyword, aliases, importance, note, relatedPageIds } = {}) {
      if (!pageId) {
        throw new Error('memory wiki pageId is required')
      }

      const page = await this.get(pageId)
      if (!page) {
        throw new Error(`memory wiki page not found: ${pageId}`)
      }

      const normalizedKeyword = String(keyword ?? '').trim()
      if (!normalizedKeyword) {
        throw new Error('memory wiki topic keyword is required')
      }

      const mergedAliases = Array.from(
        new Set([normalizedKeyword, page.title, ...(page.aliases ?? []), ...(Array.isArray(aliases) ? aliases : [])].map((item) => String(item).trim()).filter(Boolean))
      )

      const topicEntry = await topicIndex.upsert({
        ...(await topicIndex.get(normalizedKeyword.toLowerCase())),
        keyword: normalizedKeyword,
        normalizedKey: normalizedKeyword.toLowerCase(),
        aliases: mergedAliases,
        importance: importance ?? page.importance ?? 'medium',
        note: note ?? page.summary ?? ''
      })

      const linkedTopic = await topicIndex.linkPage(topicEntry.normalizedKey, pageId)
      const updatedPage = await this.linkRelatedPages(pageId, [
        ...(page.relatedPageIds ?? []),
        ...(Array.isArray(relatedPageIds) ? relatedPageIds : [])
      ])

      await writeAudit({
        eventType: 'page_topic_linked',
        pageId,
        status: updatedPage.status,
        importance: updatedPage.importance,
        details: {
          topicKey: linkedTopic.normalizedKey,
          keyword: linkedTopic.keyword
        }
      })

      return {
        page: updatedPage,
        topic: linkedTopic
      }
    },

    async mergePages({ targetPageId, sourcePageId }) {
      if (!targetPageId || !sourcePageId) {
        throw new Error('memory wiki merge requires targetPageId and sourcePageId')
      }

      const target = await this.get(targetPageId)
      const source = await this.get(sourcePageId)
      if (!target || !source) {
        throw new Error('memory wiki merge pages not found')
      }

      const mergedAliases = Array.from(new Set([...(target.aliases ?? []), target.title, ...(source.aliases ?? []), source.title]))
        .map((item) => String(item).trim())
        .filter(Boolean)

      const mergedRelated = Array.from(
        new Set([...(target.relatedPageIds ?? []), ...(source.relatedPageIds ?? []), sourcePageId])
      ).filter((item) => item !== targetPageId)

      const mergedSourceRefs = Array.from(
        new Set([...(target.sourceRefs ?? []), ...(source.sourceRefs ?? [])].map((item) => JSON.stringify(item)))
      ).map((item) => JSON.parse(item))

      const mergedBody = [target.body, source.body].filter(Boolean).join('\n\n')

      const updatedTarget = await this.update({
        ...target,
        pageId: targetPageId,
        aliases: mergedAliases,
        relatedPageIds: mergedRelated,
        sourceRefs: mergedSourceRefs,
        body: mergedBody,
        summary: target.summary || source.summary
      })

      await this.archive(sourcePageId)
      await writeAudit({
        eventType: 'pages_merged',
        pageId: targetPageId,
        relatedPageId: sourcePageId,
        details: {
          targetTitle: updatedTarget.title,
          sourceTitle: source.title
        }
      })

      return {
        target: updatedTarget,
        archivedSourcePageId: sourcePageId
      }
    },

    async delete(pageId) {
      if (!pageId) throw new Error('memory wiki pageId is required')
      const existing = await storage.readPageById(pageId)
      if (!existing) return false
      await versionStore.snapshotPage(existing, { reason: 'before_delete' })
      const deleted = await storage.deletePage({ pageId, filePath: existing.filePath })
      if (deleted) {
        await writeAudit({
          eventType: 'page_deleted',
          pageId,
          status: existing.status,
          importance: existing.importance,
          details: {
            title: existing.title
          }
        })
      }
      return deleted
    },

    async compressPage({ pageId, summary, body, reason = 'manual_compression' }) {
      if (!pageId) throw new Error('memory wiki pageId is required')
      const existing = await this.get(pageId)
      if (!existing) {
        throw new Error(`memory wiki page not found: ${pageId}`)
      }

      await versionStore.snapshotPage(existing, { reason: 'before_compression' })

      const compressed = await storage.updatePage({
        ...existing,
        pageId,
        summary: summary ?? existing.summary,
        body: body ?? existing.body
      })

      await versionStore.snapshotPage(compressed, { reason: 'after_compression' })
      await writeAudit({
        eventType: 'page_compressed',
        pageId,
        status: compressed.status,
        importance: compressed.importance,
        reason,
        details: {
          title: compressed.title
        }
      })

      return compressed
    },

    async list({ pageType, status } = {}) {
      const items = await storage.listIndexedPages()
      return items.filter((item) => {
        if (pageType && item.pageType !== pageType) return false
        if (status && item.status !== status) return false
        return true
      })
    },

    async listSummaries(filters = {}) {
      const pages = await this.list(filters)
      const hydratedPages = await Promise.all(
        pages.map(async (item) => {
          if (!item?.pageId) {
            return item
          }

          try {
            const fullPage = await this.get(item.pageId)
            return fullPage ?? item
          } catch (error) {
            console.error('Memory wiki page hydration skipped:', {
              pageId: item.pageId,
              title: item.title,
              error: error?.message ?? String(error)
            })
            return item
          }
        })
      )
      return hydratedPages.map((item) => summarizePage(item))
    },

    async getPageSourceTrace(pageId) {
      if (!pageId) throw new Error('memory wiki pageId is required')
      const page = await this.get(pageId)
      if (!page) {
        throw new Error(`memory wiki page not found: ${pageId}`)
      }

      const sourceRefs = Array.isArray(page.sourceRefs) ? page.sourceRefs : []
      const chatSources = []
      const observationSources = []

      for (const sourceRef of sourceRefs) {
        if (sourceRef?.kind === 'chat') {
          const messages = sourceRef.date ? getMessagesByDate(store, sourceRef.date) : []
          const message = messages.find((item) => item.id === sourceRef.messageId) ?? null
          chatSources.push(normalizeChatTraceItem(sourceRef, message))
          continue
        }

        if (sourceRef?.kind === 'observation') {
          const observation = sourceRef.observationId ? getObservationLog(store, sourceRef.observationId) : null
          observationSources.push(normalizeObservationTraceItem(sourceRef, observation))
        }
      }

      const relatedPages = []
      const relatedIssues = []
      for (const relatedPageId of page.relatedPageIds ?? []) {
        const relatedPage = await this.get(relatedPageId)
        if (relatedPage) {
          relatedPages.push(summarizePage(relatedPage))
          const relatedBackRefs = Array.isArray(relatedPage.relatedPageIds) ? relatedPage.relatedPageIds : []
          if (!relatedBackRefs.includes(page.pageId)) {
            relatedIssues.push({
              issueType: 'one_way_relation',
              pageId: page.pageId,
              relatedPageId,
              title: relatedPage.title || relatedPageId,
              message: `关联页面“${relatedPage.title || relatedPageId}”还没有反向关联回来。`
            })
          }
        } else {
          relatedIssues.push({
            issueType: 'missing_related_page',
            pageId: page.pageId,
            relatedPageId,
            title: relatedPageId,
            message: `关联页面引用已失效：${relatedPageId}`
          })
        }
      }

      return {
        page: summarizePage(page),
        relatedPages,
        relatedIssues,
        sourceRefs,
        chatSources,
        observationSources,
        personTimelineTrace: buildPersonTimelineTrace({
          page,
          chatSources,
          observationSources,
          relatedPages
        })
      }
    },

    async getTopicSourceTrace(normalizedKey) {
      const topic = await topicIndex.get(normalizedKey)
      if (!topic) {
        throw new Error(`topic index entry not found: ${normalizedKey}`)
      }

      const relatedPages = []
      for (const pageId of topic.memoryPageIds ?? []) {
        const page = await this.get(pageId)
        if (page) {
          relatedPages.push(summarizePage(page))
        }
      }

      const chatSources = (topic.chatRefs ?? []).map((chatRef) => {
        const sourceRef = parseSourceRefPair(chatRef)
        const date = normalizeDateValue(sourceRef.date)
        const messageId = sourceRef.refId
        const messages = date ? getMessagesByDate(store, date) : []
        const message = messageId
          ? messages.find((item) => normalizeString(item?.id) === messageId)
          : null

        return {
          kind: 'chat',
          date,
          messageId,
          exists: Boolean(message),
          preview: message?.content ? String(message.content).slice(0, 120) : '',
          title: date ? `${date} 对话` : '聊天记录'
        }
      })

      const observationSources = (topic.observationRefs ?? []).map((observationRef) => {
        const sourceRef = parseSourceRefPair(observationRef)
        const date = normalizeDateValue(sourceRef.date)
        const observationId = sourceRef.refId
        const observation = observationId ? getObservationLog(store, observationId) : null

        return {
          kind: 'observation',
          date: date || observation?.date || '',
          observationId,
          type: observation?.type || '',
          title: observation?.title || observationId || '观察日志',
          exists: Boolean(observation),
          preview: observation?.content ? String(observation.content).slice(0, 120) : ''
        }
      })

      return {
        topic,
        relatedPages,
        chatSources,
        observationSources,
        topicTimelineTrace: buildTopicTimelineTrace({
          topic,
          chatSources,
          observationSources,
          relatedPages
        })
      }
    },

    async listVersions(pageId) {
      if (!pageId) throw new Error('memory wiki pageId is required')
      return versionStore.listPageVersions(pageId)
    },

    async getVersionDiff({ pageId, fromVersionId, toVersionId }) {
      if (!pageId) throw new Error('memory wiki pageId is required')
      if (!fromVersionId) throw new Error('memory wiki fromVersionId is required')
      if (!toVersionId) throw new Error('memory wiki toVersionId is required')
      return versionStore.diffVersions({ pageId, fromVersionId, toVersionId })
    },

    async rollback(pageId, versionId) {
      if (!pageId) throw new Error('memory wiki pageId is required')
      if (!versionId) throw new Error('memory wiki versionId is required')

      const existing = await this.get(pageId)
      if (!existing) {
        throw new Error(`memory wiki page not found: ${pageId}`)
      }

      const targetVersion = await versionStore.getVersion(versionId, pageId)
      if (!targetVersion?.pageSnapshot) {
        throw new Error(`memory wiki version not found: ${versionId}`)
      }

      await versionStore.snapshotPage(existing, {
        reason: 'before_rollback',
        sourceVersionId: versionId
      })

      const restored = await storage.updatePage({
        ...targetVersion.pageSnapshot,
        pageId,
        filePath: existing.filePath
      })

      await versionStore.snapshotPage(restored, {
        reason: 'after_rollback',
        sourceVersionId: versionId
      })
      await writeAudit({
        eventType: 'page_rolled_back',
        pageId,
        versionId,
        status: restored.status,
        importance: restored.importance,
        details: {
          title: restored.title
        }
      })

      return restored
    },

    async listAuditEvents(options = {}) {
      return auditStore.list(options)
    },

    async inspectBrokenLinks() {
      if (!store) {
        throw new Error('memory wiki inspectBrokenLinks requires store')
      }
      const liveInspector = await createMemoryWikiInspector({
        store,
        memoryWikiService: this,
        topicIndex
      })
      return liveInspector.inspectBrokenLinks()
    },

    async inspectOrphanPages() {
      if (!store) {
        throw new Error('memory wiki inspectOrphanPages requires store')
      }
      const liveInspector = await createMemoryWikiInspector({
        store,
        memoryWikiService: this,
        topicIndex
      })
      return liveInspector.inspectOrphanPages()
    },

    async enqueueInspectionGovernanceRequests() {
      const created = []

      const brokenLinks = await this.inspectBrokenLinks()
      for (const issue of brokenLinks.issues ?? []) {
        created.push(await governanceStore.create(buildGovernanceRequestFromBrokenLinkIssue(issue)))
      }

      const orphanPages = await this.inspectOrphanPages()
      for (const item of orphanPages.items ?? []) {
        created.push(await governanceStore.create(buildGovernanceRequestFromOrphanItem(item)))
      }

      return {
        createdCount: created.length,
        items: created
      }
    },

    async createGovernanceRequest(input) {
      return governanceStore.create(input)
    },

    async getGovernanceRequest(requestId) {
      if (!requestId) throw new Error('memory governance requestId is required')
      return governanceStore.get(requestId)
    },

    async listGovernanceRequests(filters = {}) {
      return governanceStore.list(filters)
    },

    async updateGovernanceRequestStatus(requestId, status) {
      if (!requestId) throw new Error('memory governance requestId is required')
      if (!status) throw new Error('memory governance status is required')
      return governanceStore.updateStatus(requestId, status)
    },

    async applyGovernanceUpgradeRequest(requestId) {
      if (!requestId) throw new Error('memory governance requestId is required')
      return applyObservationWikiUpgradeRequest(store, {
        baseDir,
        requestId
      })
    },

    getStorage() {
      return storage
    },

    getVersionStore() {
      return versionStore
    },

    getAuditStore() {
      return auditStore
    },

    getTopicIndex() {
      return topicIndex
    },

    getGovernanceStore() {
      return governanceStore
    }
  }
}
