import { createMemoryWikiService, createTopicIndexStore } from '../memory-wiki/index.js'

const IDENTITY_PROFILE_PAGE_TYPE = 'identity_profile'

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
    title: stripTrailingParticles(normalizeString(userMessage).slice(0, 24)) || '身份记忆来源',
    excerpt: normalizeString(userMessage).slice(0, 120)
  }
}

function normalizeKey(value) {
  return normalizeString(value).toLowerCase()
}

const IDENTITY_PROFILE_CANDIDATE_FIELDS = [
  'userName',
  'preferredName',
  'cornieRelationship',
  'identitySummary',
  'lifeStageSummary',
  'currentFocus',
  'stressors',
  'communicationPreference'
]

// LLM 提炼轮次提议的身份候选（443/445）：仅接受白名单字段，全部为空视为无候选。
// 正则提取已随 444 全面弃用，候选只来自 LLM。
function normalizeProfileCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return null
  }

  const normalized = {}
  for (const field of IDENTITY_PROFILE_CANDIDATE_FIELDS) {
    const snakeCase = field.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`)
    const value = normalizeString(candidate[field] ?? candidate[snakeCase])
    if (value) {
      normalized[field] = value
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null
}

function buildChatRef({ date, messageId }) {
  return `${normalizeString(date)}#${normalizeString(messageId)}`
}

function mergeAliases(page, candidates) {
  const values = [
    ...(Array.isArray(page?.aliases) ? page.aliases : []),
    ...(Array.isArray(candidates) ? candidates : [])
  ]
  return Array.from(new Set(values.map((item) => normalizeString(item)).filter(Boolean)))
}

function buildProfileTitle(candidate, existingPage) {
  return normalizeString(candidate.userName) || normalizeString(existingPage?.title) || '用户主身份'
}

function createConflict(field, existingValue, incomingValue) {
  return {
    field,
    existingValue: normalizeString(existingValue),
    incomingValue: normalizeString(incomingValue)
  }
}

function splitListLikeValue(value) {
  return normalizeString(value)
    .split(/[；;、,，]\s*/g)
    .map((item) => normalizeString(item))
    .filter(Boolean)
}

function mergeUniqueSegments(existingValue, incomingValue, { separator = '；' } = {}) {
  const existingItems = splitListLikeValue(existingValue)
  const incomingItems = splitListLikeValue(incomingValue)
  const merged = []

  for (const item of [...existingItems, ...incomingItems]) {
    if (!item) continue
    const normalizedItem = normalizeCompare(item)
    const duplicated = merged.some((current) => {
      const normalizedCurrent = normalizeCompare(current)
      return (
        normalizedCurrent === normalizedItem ||
        normalizedCurrent.includes(normalizedItem) ||
        normalizedItem.includes(normalizedCurrent)
      )
    })
    if (!duplicated) {
      merged.push(item)
    }
  }

  return merged.join(separator)
}

function mergeSummaryLikeField(existingValue, incomingValue) {
  const currentValue = normalizeString(existingValue)
  const nextValue = normalizeString(incomingValue)
  if (!nextValue) return currentValue
  if (!currentValue) return nextValue

  const normalizedCurrent = normalizeCompare(currentValue)
  const normalizedNext = normalizeCompare(nextValue)
  if (normalizedCurrent === normalizedNext || normalizedCurrent.includes(normalizedNext)) {
    return currentValue
  }
  if (normalizedNext.includes(normalizedCurrent)) {
    return nextValue
  }

  return mergeUniqueSegments(currentValue, nextValue, { separator: ' ' })
}

function mergeFocusField(existingValue, incomingValue) {
  return mergeUniqueSegments(existingValue, incomingValue, { separator: '、' })
}

function mergeCommunicationPreference(existingValue, incomingValue) {
  return mergeUniqueSegments(existingValue, incomingValue, { separator: '；' })
}

function compareField(existingValue, incomingValue, fieldName, conflicts, updates) {
  const nextValue = normalizeString(incomingValue)
  if (!nextValue) return

  const currentValue = normalizeString(existingValue)
  if (!currentValue) {
    updates[fieldName] = nextValue
    return
  }

  if (normalizeCompare(currentValue) === normalizeCompare(nextValue)) {
    return
  }

  conflicts.push(createConflict(fieldName, currentValue, nextValue))
}

function mergeSoftField(existingValue, incomingValue, fieldName, updates, mergeFn) {
  const mergedValue = normalizeString(mergeFn(existingValue, incomingValue))
  const currentValue = normalizeString(existingValue)
  if (!mergedValue || normalizeCompare(mergedValue) === normalizeCompare(currentValue)) {
    return
  }
  updates[fieldName] = mergedValue
}

async function ensureProfileConflictGovernanceCandidate(memoryWiki, page, candidate, conflicts, sourceRef) {
  if (!page?.pageId || !Array.isArray(conflicts) || conflicts.length === 0) {
    return
  }

  const profileConflicts = conflicts.filter((item) =>
    ['userName', 'preferredName', 'cornieRelationship'].includes(normalizeString(item?.field))
  )
  if (profileConflicts.length === 0) {
    return
  }

  const governanceRequests = await memoryWiki.listGovernanceRequests({
    requestType: 'identity_profile_conflict',
    queueSection: 'identity_profile_reviews'
  })
  const duplicated = governanceRequests.some((item) =>
    (item.status === 'pending' || item.status === 'deferred') &&
    Array.isArray(item.pageIds) &&
    item.pageIds.includes(page.pageId)
  )
  if (duplicated) {
    return
  }

  await memoryWiki.createGovernanceRequest({
    requestType: 'identity_profile_conflict',
    triggerSource: 'conversation_conflict',
    queueSection: 'identity_profile_reviews',
    riskLevel: 'high',
    pageIds: [page.pageId],
    title: page.title || page.pageId,
    reason: '主身份页出现了名字、称呼或与 Cornie 的关系冲突，建议由人类确认后再决定是否改写正式长期记忆。',
    evidence: profileConflicts.map((item) => ({
      field: item.field,
      existingValue: item.existingValue,
      incomingValue: item.incomingValue,
      sourceDate: sourceRef?.date ?? '',
      sourceMessageId: sourceRef?.messageId ?? '',
      sourceTitle: sourceRef?.title ?? ''
    })),
    payload: {
      action: 'review_identity_profile_conflict',
      candidateUserName: candidate?.userName ?? '',
      candidatePreferredName: candidate?.preferredName ?? '',
      candidateCornieRelationship: candidate?.cornieRelationship ?? '',
      conflicts: profileConflicts
    }
  })
}

async function getPrimaryIdentityProfile(memoryWiki) {
  const pages = await memoryWiki.listSummaries({
    pageType: IDENTITY_PROFILE_PAGE_TYPE,
    status: 'active'
  })

  if (!Array.isArray(pages) || pages.length === 0) {
    return null
  }

  return pages[0]
}

async function ensureProfileTopicLink({ baseDir, page, date, messageId, candidate }) {
  if (!page?.pageId) {
    return null
  }

  const keyword = normalizeString(page.userName) || normalizeString(candidate?.userName) || normalizeString(page.title)
  const normalizedKey = normalizeKey(keyword)
  if (!normalizedKey) {
    return null
  }

  const topicIndex = await createTopicIndexStore(baseDir)
  const existing = await topicIndex.get(normalizedKey)
  const aliases = mergeAliases(page, [
    candidate?.userName,
    candidate?.preferredName,
    page?.title,
    page?.preferredName
  ])

  await topicIndex.upsert({
    ...(existing ?? {}),
    keyword: existing?.keyword || keyword,
    normalizedKey,
    aliases,
    importance: page.importance || existing?.importance || 'critical',
    note: page.summary || page.identitySummary || existing?.note || '',
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

export async function upsertIdentityProfileFromConversation(
  store,
  {
    baseDir = process.cwd(),
    date,
    messageId,
    userMessage,
    candidate
  } = {}
) {
  candidate = normalizeProfileCandidate(candidate)
  if (!candidate) {
    return { action: 'skipped', reason: 'no_candidate' }
  }

  const memoryWiki = await createMemoryWikiService({ baseDir, store })
  const summaryPage = await getPrimaryIdentityProfile(memoryWiki)
  const existingPage = summaryPage?.pageId ? await memoryWiki.get(summaryPage.pageId) : null
  const sourceRef = buildSourceRef({ date, messageId, userMessage })

  if (!existingPage) {
    const created = await memoryWiki.create({
      pageType: IDENTITY_PROFILE_PAGE_TYPE,
      title: buildProfileTitle(candidate),
      userName: candidate.userName,
      preferredName: candidate.preferredName,
      cornieRelationship: candidate.cornieRelationship,
      identitySummary: candidate.identitySummary,
      lifeStageSummary: candidate.lifeStageSummary,
      currentFocus: candidate.currentFocus,
      stressors: candidate.stressors,
      communicationPreference: candidate.communicationPreference,
      aliases: mergeAliases(null, [candidate.userName, candidate.preferredName]),
      importance: 'critical',
      ownerConfirmed: false,
      sourceRefs: [sourceRef]
    })

    await ensureProfileTopicLink({
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
      conflicts: []
    }
  }

  const conflicts = []
  const updates = {}

  compareField(existingPage.userName, candidate.userName, 'userName', conflicts, updates)
  compareField(existingPage.preferredName, candidate.preferredName, 'preferredName', conflicts, updates)
  compareField(existingPage.cornieRelationship, candidate.cornieRelationship, 'cornieRelationship', conflicts, updates)
  mergeSoftField(existingPage.identitySummary, candidate.identitySummary, 'identitySummary', updates, mergeSummaryLikeField)
  mergeSoftField(existingPage.lifeStageSummary, candidate.lifeStageSummary, 'lifeStageSummary', updates, mergeSummaryLikeField)
  mergeSoftField(existingPage.currentFocus, candidate.currentFocus, 'currentFocus', updates, mergeFocusField)
  mergeSoftField(existingPage.stressors, candidate.stressors, 'stressors', updates, mergeFocusField)
  mergeSoftField(
    existingPage.communicationPreference,
    candidate.communicationPreference,
    'communicationPreference',
    updates,
    mergeCommunicationPreference
  )

  const aliases = mergeAliases(existingPage, [candidate.userName, candidate.preferredName])
  const sourceRefs = Array.isArray(existingPage.sourceRefs) ? existingPage.sourceRefs : []
  const hasSameSource = sourceRefs.some(
    (item) =>
      normalizeString(item?.kind) === 'chat' &&
      normalizeString(item?.date) === normalizeString(sourceRef.date) &&
      normalizeString(item?.messageId) === normalizeString(sourceRef.messageId)
  )

  if (conflicts.length > 0) {
    if (!hasSameSource) {
      await memoryWiki.addSourceRef(existingPage.pageId, sourceRef)
    }
    await ensureProfileConflictGovernanceCandidate(memoryWiki, existingPage, candidate, conflicts, sourceRef)
    await ensureProfileTopicLink({
      baseDir,
      page: {
        ...existingPage,
        sourceRefs: hasSameSource ? sourceRefs : [...sourceRefs, sourceRef]
      },
      date,
      messageId,
      candidate
    })

    return {
      action: 'conflict',
      pageId: existingPage.pageId,
      candidate,
      conflicts
    }
  }

  const shouldUpdateAliases =
    aliases.length !== (Array.isArray(existingPage.aliases) ? existingPage.aliases.length : 0) ||
    aliases.some((item, index) => item !== existingPage.aliases?.[index])

  if (!hasSameSource) {
    updates.sourceRefs = [...sourceRefs, sourceRef]
  }

  if (shouldUpdateAliases) {
    updates.aliases = aliases
  }

  if (Object.keys(updates).length === 0) {
    return {
      action: 'noop',
      pageId: existingPage.pageId,
      candidate,
      conflicts: []
    }
  }

  const updated = await memoryWiki.update({
    ...existingPage,
    ...updates,
    pageId: existingPage.pageId,
    title: buildProfileTitle({ ...existingPage, ...updates }, existingPage),
    importance: existingPage.importance || 'critical'
  })

  await ensureProfileTopicLink({
    baseDir,
    page: updated,
    date,
    messageId,
    candidate
  })

  return {
    action: 'updated',
    pageId: updated.pageId,
    candidate,
    conflicts: []
  }
}
