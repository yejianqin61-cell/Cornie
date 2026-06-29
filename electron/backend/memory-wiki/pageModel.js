import { randomUUID } from 'node:crypto'
import { MEMORY_WIKI_PAGE_TYPE_DIRECTORY, MEMORY_WIKI_PAGE_TYPES } from './constants.js'

export const MEMORY_WIKI_PRIMARY_STATUSES = Object.freeze(['active', 'inactive', 'archived'])
export const MEMORY_WIKI_COMPATIBLE_STATUSES = Object.freeze([...MEMORY_WIKI_PRIMARY_STATUSES, 'draft', 'review'])

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

function slugifySegment(value) {
  const normalized = normalizeString(value)
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || 'untitled'
}

export function assertPageType(pageType) {
  const normalized = normalizeString(pageType)
  if (!MEMORY_WIKI_PAGE_TYPES.includes(normalized)) {
    throw new Error(`unsupported memory wiki page type: ${normalized || '<empty>'}`)
  }
  return normalized
}

export function getPageDirectoryName(pageType) {
  return MEMORY_WIKI_PAGE_TYPE_DIRECTORY[assertPageType(pageType)]
}

export function buildPageSlug({ title, slug, aliases } = {}) {
  if (normalizeString(slug)) return slugifySegment(slug)
  if (normalizeString(title)) return slugifySegment(title)

  const alias = normalizeStringArray(aliases)[0]
  return slugifySegment(alias || 'untitled')
}

export function buildPageId({ pageType, slug, pageId } = {}) {
  if (normalizeString(pageId)) return normalizeString(pageId)
  return `${assertPageType(pageType)}_${buildPageSlug({ slug })}_${randomUUID().slice(0, 8)}`
}

export function normalizePageStatus(status, { fallback = 'active', allowLegacy = true } = {}) {
  const normalized = normalizeString(status) || fallback
  const allowed = allowLegacy ? MEMORY_WIKI_COMPATIBLE_STATUSES : MEMORY_WIKI_PRIMARY_STATUSES
  if (!allowed.includes(normalized)) {
    throw new Error(`unsupported memory wiki status: ${normalized}`)
  }
  return normalized
}

export function createDefaultPageMetadata(input = {}) {
  const pageType = assertPageType(input.pageType ?? input.page_type)
  const title = normalizeString(input.title)
  const aliases = normalizeStringArray(input.aliases)
  const slug = buildPageSlug({ title, slug: input.slug, aliases })
  const now = new Date().toISOString()

  return {
    pageId: buildPageId({ pageType, slug, pageId: input.pageId ?? input.page_id }),
    pageType,
    title: title || slug,
    slug,
    aliases,
    relatedPageIds: normalizeStringArray(input.relatedPageIds ?? input.related_page_ids),
    summary: normalizeString(input.summary),
    status: normalizePageStatus(input.status),
    confidence: normalizeString(input.confidence) || 'medium',
    sourceRefs: Array.isArray(input.sourceRefs ?? input.source_refs) ? input.sourceRefs ?? input.source_refs : [],
    firstNotedAt: normalizeString(input.firstNotedAt ?? input.first_noted_at) || now,
    lastUpdatedAt: normalizeString(input.lastUpdatedAt ?? input.last_updated_at) || now,
    lastMentionedAt: normalizeString(input.lastMentionedAt ?? input.last_mentioned_at) || '',
    importance: normalizeString(input.importance) || 'medium',
    ownerConfirmed: input.ownerConfirmed ?? input.owner_confirmed ?? false
  }
}

export function createPageModel(input = {}) {
  const metadata = createDefaultPageMetadata(input)
  return {
    ...metadata,
    userName: normalizeString(input.userName ?? input.user_name),
    preferredName: normalizeString(input.preferredName ?? input.preferred_name),
    cornieRelationship: normalizeString(input.cornieRelationship ?? input.cornie_relationship),
    identitySummary: normalizeString(input.identitySummary ?? input.identity_summary),
    lifeStageSummary: normalizeString(input.lifeStageSummary ?? input.life_stage_summary),
    currentFocus: normalizeString(input.currentFocus ?? input.current_focus),
    stressors: normalizeString(input.stressors),
    communicationPreference: normalizeString(input.communicationPreference ?? input.communication_preference),
    personName: normalizeString(input.personName ?? input.person_name),
    relationshipToUser: normalizeString(input.relationshipToUser ?? input.relationship_to_user),
    roleSummary: normalizeString(input.roleSummary ?? input.role_summary),
    personalitySummary: normalizeString(input.personalitySummary ?? input.personality_summary),
    meaningToUser: normalizeString(input.meaningToUser ?? input.meaning_to_user),
    sharedExperienceSummary: normalizeString(input.sharedExperienceSummary ?? input.shared_experience_summary),
    emotionalWeight: normalizeString(input.emotionalWeight ?? input.emotional_weight),
    timelineSummary: normalizeString(input.timelineSummary ?? input.timeline_summary),
    firstKnownPeriod: normalizeString(input.firstKnownPeriod ?? input.first_known_period),
    preferenceType: normalizeString(input.preferenceType ?? input.preference_type),
    stance: normalizeString(input.stance),
    stabilityLevel: normalizeString(input.stabilityLevel ?? input.stability_level),
    traitType: normalizeString(input.traitType ?? input.trait_type),
    confidenceLevel: normalizeString(input.confidenceLevel ?? input.confidence_level),
    traitSummary: normalizeString(input.traitSummary ?? input.trait_summary),
    evidenceCount: normalizeInteger(input.evidenceCount ?? input.evidence_count),
    lastConfirmedAt: normalizeString(input.lastConfirmedAt ?? input.last_confirmed_at),
    triggerKeywords: normalizeStringArray(input.triggerKeywords ?? input.trigger_keywords),
    body: normalizeString(input.body),
    directoryName: getPageDirectoryName(metadata.pageType),
    filename: `${metadata.slug}.md`
  }
}
