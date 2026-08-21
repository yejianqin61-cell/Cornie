import { createMemoryWikiService, createTopicIndexStore } from '../memory-wiki/index.js'

const IDENTITY_TRAIT_PAGE_TYPE = 'identity_trait'

function normalizeString(value) {
  return String(value ?? '').trim()
}

function normalizeCompare(value) {
  return normalizeString(value).replace(/\s+/g, ' ').toLowerCase()
}

function stripTrailingParticles(value) {
  return normalizeString(value).replace(/[。！!？?,，、；;：:“”"'`~\s]+$/g, '').trim()
}

function dedupeStrings(items = []) {
  return Array.from(new Set(items.map((item) => normalizeString(item)).filter(Boolean)))
}

function normalizeKey(value) {
  return normalizeString(value).toLowerCase()
}

function buildChatRef({ date, messageId }) {
  return `${normalizeString(date)}#${normalizeString(messageId)}`
}

// LLM 提炼轮次提议的侧写候选（443/445）：title 必填。
// LLM 提炼轮次提议的侧写候选（443/445）：title 必填。
// 正则提取已随 444 全面弃用，候选只来自 LLM。
function normalizeTraitCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return null
  }

  const title = normalizeString(candidate.title)
  if (!title) {
    return null
  }

  return {
    title,
    traitType: normalizeString(candidate.traitType ?? candidate.trait_type),
    traitSummary: normalizeString(candidate.traitSummary ?? candidate.trait_summary),
    triggerKeywords: Array.isArray(candidate.triggerKeywords)
      ? candidate.triggerKeywords.map((item) => normalizeString(item)).filter(Boolean)
      : []
  }
}

function buildSourceRef({ date, messageId, userMessage }) {
  return {
    kind: 'chat',
    date,
    messageId,
    title: stripTrailingParticles(normalizeString(userMessage).slice(0, 24)) || '侧写记忆来源',
    excerpt: normalizeString(userMessage).slice(0, 120)
  }
}

function getStabilityLevel(evidenceCount) {
  if (evidenceCount >= 4) return 'high'
  if (evidenceCount >= 2) return 'medium'
  return 'low'
}

function getConfidenceLevel(evidenceCount) {
  if (evidenceCount >= 4) return 'high'
  if (evidenceCount >= 2) return 'medium'
  return 'low'
}

function sameTrait(page, candidate) {
  if (normalizeCompare(page.traitType) !== normalizeCompare(candidate.traitType)) {
    return false
  }

  const pageNames = dedupeStrings([page.title, ...(Array.isArray(page.aliases) ? page.aliases : [])])
  return pageNames.some((item) => normalizeCompare(item) === normalizeCompare(candidate.title))
}

async function findMatchingTraitPage(memoryWiki, candidate) {
  const pageSummaries = await memoryWiki.listSummaries({
    pageType: IDENTITY_TRAIT_PAGE_TYPE,
    status: 'review'
  })

  for (const summary of pageSummaries) {
    const page = summary?.pageId ? await memoryWiki.get(summary.pageId) : null
    if (page && sameTrait(page, candidate)) {
      return page
    }
  }

  const activeSummaries = await memoryWiki.listSummaries({
    pageType: IDENTITY_TRAIT_PAGE_TYPE,
    status: 'active'
  })
  for (const summary of activeSummaries) {
    const page = summary?.pageId ? await memoryWiki.get(summary.pageId) : null
    if (page && sameTrait(page, candidate)) {
      return page
    }
  }

  return null
}

async function getPrimaryIdentityProfile(memoryWiki) {
  const summaries = await memoryWiki.listSummaries({
    pageType: 'identity_profile',
    status: 'active'
  })
  if (!Array.isArray(summaries) || summaries.length === 0) {
    return null
  }
  return summaries[0]?.pageId ? memoryWiki.get(summaries[0].pageId) : null
}

async function ensureProfileLink(memoryWiki, pageId) {
  const profile = await getPrimaryIdentityProfile(memoryWiki)
  if (!profile?.pageId || profile.pageId === pageId) {
    return
  }

  const profileRelated = Array.isArray(profile.relatedPageIds) ? profile.relatedPageIds : []
  if (!profileRelated.includes(pageId)) {
    await memoryWiki.linkRelatedPages(profile.pageId, [...profileRelated, pageId])
  }

  const page = await memoryWiki.get(pageId)
  const pageRelated = Array.isArray(page?.relatedPageIds) ? page.relatedPageIds : []
  if (page && !pageRelated.includes(profile.pageId)) {
    await memoryWiki.linkRelatedPages(pageId, [...pageRelated, profile.pageId])
  }
}

async function ensureTraitTopicLink({ baseDir, page, date, messageId, candidate }) {
  if (!page?.pageId) {
    return null
  }

  const keyword = normalizeString(page.title) || normalizeString(candidate?.title)
  const normalizedKey = normalizeKey(keyword)
  if (!normalizedKey) {
    return null
  }

  const topicIndex = await createTopicIndexStore(baseDir)
  const existing = await topicIndex.get(normalizedKey)
  const aliases = dedupeStrings([
    keyword,
    page.title,
    candidate?.title,
    ...(Array.isArray(page.aliases) ? page.aliases : []),
    ...(Array.isArray(page.triggerKeywords) ? page.triggerKeywords : []),
    candidate?.traitType
  ])

  await topicIndex.upsert({
    ...(existing ?? {}),
    keyword: existing?.keyword || keyword,
    normalizedKey,
    aliases: dedupeStrings([...(existing?.aliases ?? []), ...aliases]),
    importance: page.importance || existing?.importance || 'medium',
    note: page.summary || page.traitSummary || existing?.note || '',
    lastMentionedAt: normalizeString(date) || existing?.lastMentionedAt || ''
  })

  if (normalizeString(date)) {
    await topicIndex.addDateRef(normalizedKey, date)
  }

  if (normalizeString(date) && normalizeString(messageId)) {
    await topicIndex.addChatRef(normalizedKey, buildChatRef({ date, messageId }))
  }

  await topicIndex.linkPage(normalizedKey, page.pageId)
  return topicIndex.get(normalizedKey)
}

function buildAliases(existingPage, candidate) {
  return dedupeStrings([
    ...(Array.isArray(existingPage?.aliases) ? existingPage.aliases : []),
    candidate.title
  ])
}

export async function upsertIdentityTraitFromConversation(
  store,
  {
    baseDir = process.cwd(),
    date,
    messageId,
    userMessage,
    candidate
  } = {}
) {
  candidate = normalizeTraitCandidate(candidate)
  if (!candidate) {
    return { action: 'skipped', reason: 'no_candidate' }
  }

  const memoryWiki = await createMemoryWikiService({ baseDir, store })
  const existingPage = await findMatchingTraitPage(memoryWiki, candidate)
  const sourceRef = buildSourceRef({ date, messageId, userMessage })

  if (!existingPage) {
    const created = await memoryWiki.create({
      pageType: IDENTITY_TRAIT_PAGE_TYPE,
      title: candidate.title,
      traitType: candidate.traitType,
      traitSummary: candidate.traitSummary,
      aliases: buildAliases(null, candidate),
      triggerKeywords: candidate.triggerKeywords,
      evidenceCount: 1,
      confidenceLevel: getConfidenceLevel(1),
      stabilityLevel: getStabilityLevel(1),
      lastConfirmedAt: date,
      ownerConfirmed: false,
      importance: 'medium',
      status: 'review',
      sourceRefs: [sourceRef]
    })

    await ensureProfileLink(memoryWiki, created.pageId)
    await ensureTraitTopicLink({
      baseDir,
      page: created,
      date,
      messageId,
      candidate
    })

    return {
      action: 'created',
      pageId: created.pageId,
      candidate,
      evidenceCount: 1
    }
  }

  const sourceRefs = Array.isArray(existingPage.sourceRefs) ? existingPage.sourceRefs : []
  const hasSameSource = sourceRefs.some(
    (item) =>
      normalizeString(item?.kind) === 'chat' &&
      normalizeString(item?.date) === normalizeString(sourceRef.date) &&
      normalizeString(item?.messageId) === normalizeString(sourceRef.messageId)
  )

  const nextEvidenceCount = Math.max(Number(existingPage.evidenceCount || 0), 0) + (hasSameSource ? 0 : 1)
  const updates = {
    pageId: existingPage.pageId,
    aliases: buildAliases(existingPage, candidate),
    triggerKeywords: dedupeStrings([
      ...(Array.isArray(existingPage.triggerKeywords) ? existingPage.triggerKeywords : []),
      ...candidate.triggerKeywords
    ]),
    evidenceCount: nextEvidenceCount,
    confidenceLevel: getConfidenceLevel(nextEvidenceCount),
    stabilityLevel: getStabilityLevel(nextEvidenceCount),
    lastConfirmedAt: date,
    status: existingPage.ownerConfirmed ? existingPage.status : 'review'
  }

  if (!hasSameSource) {
    updates.sourceRefs = [...sourceRefs, sourceRef]
  }

  const updated = await memoryWiki.update({
    ...existingPage,
    ...updates
  })

  await ensureProfileLink(memoryWiki, updated.pageId)
  await ensureTraitTopicLink({
    baseDir,
    page: updated,
    date,
    messageId,
    candidate
  })

  return {
    action: hasSameSource ? 'noop' : 'updated',
    pageId: updated.pageId,
    candidate,
    evidenceCount: updated.evidenceCount
  }
}
