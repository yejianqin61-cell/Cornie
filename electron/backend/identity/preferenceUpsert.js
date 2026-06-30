import { createMemoryWikiService } from '../memory-wiki/index.js'

const IDENTITY_PREFERENCE_PAGE_TYPE = 'identity_preference'

function normalizeString(value) {
  return String(value ?? '').trim()
}

function normalizeCompare(value) {
  return normalizeString(value).replace(/\s+/g, ' ').toLowerCase()
}

function stripTrailingParticles(value) {
  return normalizeString(value).replace(/[。！!？?,，、；;：:“”"'`~\s]+$/g, '').trim()
}

function buildSourceRef({ date, messageId, userMessage }) {
  return {
    kind: 'chat',
    date,
    messageId,
    title: stripTrailingParticles(normalizeString(userMessage).slice(0, 24)) || '偏好记忆来源',
    excerpt: normalizeString(userMessage).slice(0, 120)
  }
}

function getStabilityLevel(evidenceCount) {
  if (evidenceCount >= 4) return 'high'
  if (evidenceCount >= 2) return 'medium'
  return 'low'
}

function dedupeStrings(items = []) {
  return Array.from(new Set(items.map((item) => normalizeString(item)).filter(Boolean)))
}

function guessPreferenceType(target, rawMessage) {
  const text = `${normalizeString(target)} ${normalizeString(rawMessage)}`

  if (/[吃喝奶茶咖啡饭菜火锅烧烤甜辣咸口味饮料水果零食]/.test(text)) {
    return '饮食'
  }
  if (/[作息睡觉早起熬夜午睡]/.test(text)) {
    return '作息'
  }
  if (/[聊天语气说话温柔直接陪伴安慰称呼]/.test(text)) {
    return '交流'
  }
  if (/[风格颜色界面简洁可爱文学]/.test(text)) {
    return '风格'
  }
  return '其他'
}

function cleanupPreferenceTarget(target) {
  const cleaned = stripTrailingParticles(target)
    .replace(/^(太|很|更|比较|特别)/, '')
    .replace(/^(还是|也|都|又|真|挺|可)/, '')
    .replace(/^(喝|吃|用|看|听|聊|这种|这个|那种|那个)/, '')
    .trim()

  if (!cleaned || cleaned.length > 24) return ''

  const blocked = new Set([
    '这样',
    '这个',
    '那个',
    '东西',
    '一些',
    '一点',
    '你',
    '我'
  ])

  return blocked.has(cleaned) ? '' : cleaned
}

function takePreferenceTarget(text, marker) {
  const startIndex = text.indexOf(marker)
  if (startIndex === -1) return ''

  const raw = text.slice(startIndex + marker.length)
  const stopMatch = raw.match(/[，。！？；,!?\n]/)
  const cropped = stopMatch ? raw.slice(0, stopMatch.index) : raw
  return cleanupPreferenceTarget(cropped)
}

function buildCandidate(userMessage) {
  const text = normalizeString(userMessage)
  if (!text) return null

  const markers = [
    { marker: '我不喜欢', stance: '不喜欢' },
    { marker: '我还是不喜欢', stance: '不喜欢' },
    { marker: '我讨厌', stance: '不喜欢' },
    { marker: '我更喜欢', stance: '喜欢' },
    { marker: '我喜欢', stance: '喜欢' },
    { marker: '我爱', stance: '喜欢' }
  ]

  for (const { marker, stance } of markers) {
    const target = takePreferenceTarget(text, marker)
    if (!target) continue

    const preferenceType = guessPreferenceType(target, text)
    const title = target
    const triggerKeywords = dedupeStrings([target, preferenceType, stance])

    return {
      title,
      stance,
      preferenceType,
      triggerKeywords
    }
  }

  return null
}

function samePreference(page, candidate) {
  if (normalizeCompare(page.stance) !== normalizeCompare(candidate.stance)) {
    return false
  }

  const pageNames = dedupeStrings([page.title, ...(Array.isArray(page.aliases) ? page.aliases : [])])
  return pageNames.some((item) => normalizeCompare(item) === normalizeCompare(candidate.title))
}

function buildAliases(existingPage, candidate) {
  return dedupeStrings([
    ...(Array.isArray(existingPage?.aliases) ? existingPage.aliases : []),
    candidate.title
  ])
}

async function findMatchingPreferencePage(memoryWiki, candidate) {
  const pageSummaries = await memoryWiki.listSummaries({
    pageType: IDENTITY_PREFERENCE_PAGE_TYPE,
    status: 'active'
  })

  for (const summary of pageSummaries) {
    const page = summary?.pageId ? await memoryWiki.get(summary.pageId) : null
    if (page && samePreference(page, candidate)) {
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

export function extractIdentityPreferenceCandidate(userMessage) {
  return buildCandidate(userMessage)
}

export async function upsertIdentityPreferenceFromConversation(
  store,
  {
    baseDir = process.cwd(),
    date,
    messageId,
    userMessage
  } = {}
) {
  const candidate = buildCandidate(userMessage)
  if (!candidate) {
    return { action: 'skipped', reason: 'no_candidate' }
  }

  const memoryWiki = await createMemoryWikiService({ baseDir, store })
  const existingPage = await findMatchingPreferencePage(memoryWiki, candidate)
  const sourceRef = buildSourceRef({ date, messageId, userMessage })

  if (!existingPage) {
    const created = await memoryWiki.create({
      pageType: IDENTITY_PREFERENCE_PAGE_TYPE,
      title: candidate.title,
      stance: candidate.stance,
      preferenceType: candidate.preferenceType,
      aliases: buildAliases(null, candidate),
      triggerKeywords: candidate.triggerKeywords,
      evidenceCount: 1,
      stabilityLevel: getStabilityLevel(1),
      lastConfirmedAt: date,
      ownerConfirmed: false,
      importance: 'medium',
      sourceRefs: [sourceRef]
    })

    await ensureProfileLink(memoryWiki, created.pageId)

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
    stabilityLevel: getStabilityLevel(nextEvidenceCount),
    lastConfirmedAt: date
  }

  if (!hasSameSource) {
    updates.sourceRefs = [...sourceRefs, sourceRef]
  }

  const updated = await memoryWiki.update({
    ...existingPage,
    ...updates
  })

  await ensureProfileLink(memoryWiki, updated.pageId)

  return {
    action: hasSameSource ? 'noop' : 'updated',
    pageId: updated.pageId,
    candidate,
    evidenceCount: updated.evidenceCount
  }
}
