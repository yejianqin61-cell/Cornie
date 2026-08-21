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

function pickFirstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      return stripTrailingParticles(match[1])
    }
  }
  return ''
}

function extractUserName(userMessage) {
  const text = normalizeString(userMessage)
  if (!text) return ''

  const directName = pickFirstMatch(text, [
    /(?:^|[\s，。！？；,!?])我叫([^\s，。！？；,!?]{1,24})/,
    /(?:^|[\s，。！？；,!?])我的名字叫([^\s，。！？；,!?]{1,24})/,
    /(?:^|[\s，。！？；,!?])我是([^\s，。！？；,!?]{1,24})(?:呀|哦|啦|呢)?$/
  ])

  if (!directName) return ''

  const blocked = new Set([
    '你爸爸',
    '你的爸爸',
    '你爹',
    '你的创造者',
    '学生',
    '男生',
    '女生',
    '人类',
    '主人'
  ])

  return blocked.has(directName) ? '' : directName
}

function extractPreferredName(userMessage) {
  const text = normalizeString(userMessage)
  if (!text) return ''

  return pickFirstMatch(text, [
    /(?:你|以后|之后)?(?:可以|就)?(?:叫我|喊我|称呼我)([^\s，。！？；,!?]{1,24})/,
    /我希望你(?:叫我|喊我|称呼我)([^\s，。！？；,!?]{1,24})/
  ])
}

function extractCornieRelationship(userMessage) {
  const text = normalizeString(userMessage)
  if (!text) return ''

  const relationshipPatterns = [
    { pattern: /我是你(?:的)?爸爸/, value: '用户是 Cornie 的爸爸' },
    { pattern: /我是你(?:的)?创造者/, value: '用户是 Cornie 的创造者' },
    { pattern: /我是你的主人/, value: '用户是 Cornie 的主人' },
    { pattern: /你是我(?:的)?女儿/, value: '用户视 Cornie 为自己的女儿' },
    { pattern: /你是我(?:的)?宝宝/, value: '用户视 Cornie 为自己的宝宝' }
  ]

  for (const item of relationshipPatterns) {
    if (item.pattern.test(text)) {
      return item.value
    }
  }

  return ''
}

function detectLifeStageSummary(userMessage) {
  const text = normalizeString(userMessage)
  if (!text) return ''

  const hasStudyPressure = /考试|期末|assignment|作业|学校|上课|学习|学业/.test(text)
  const hasCareerPressure = /实习|找工作|求职|面试|就业/.test(text)
  const hasProjectPressure = /项目|开发|毕设|论文/.test(text)

  if (hasStudyPressure && hasCareerPressure && hasProjectPressure) {
    return '当前处于学业、项目、实习与求职压力交织阶段。'
  }
  if (hasStudyPressure && hasCareerPressure) {
    return '当前处于学业与实习求职并行阶段。'
  }
  if (hasStudyPressure && hasProjectPressure) {
    return '当前处于学业与项目并行推进阶段。'
  }
  if (hasCareerPressure && hasProjectPressure) {
    return '当前处于项目与实习求职并行推进阶段。'
  }
  if (hasStudyPressure) {
    return '当前处于学业压力较集中的阶段。'
  }
  if (hasCareerPressure) {
    return '当前处于实习求职压力较集中的阶段。'
  }
  if (hasProjectPressure) {
    return '当前处于项目推进压力较集中的阶段。'
  }

  return ''
}

function detectCurrentFocus(userMessage) {
  const text = normalizeString(userMessage)
  if (!text) return ''

  const focus = []
  if (/项目|开发|毕设|论文/.test(text)) focus.push('项目推进')
  if (/考试|期末|assignment|作业|学习|学业/.test(text)) focus.push('考试与学业')
  if (/实习|找工作|求职|面试|就业/.test(text)) focus.push('实习与求职')

  return focus.length > 0 ? focus.join('、') : ''
}

function detectStressors(userMessage) {
  const text = normalizeString(userMessage)
  if (!text) return ''

  const stressSignals = /累|好累|压力|焦虑|难|熬夜|忙不过来|崩|烦/.test(text)
  if (!stressSignals) {
    return ''
  }

  const stressors = []
  if (/项目|开发|毕设|论文/.test(text)) stressors.push('项目推进压力')
  if (/考试|期末|assignment|作业|学习|学业/.test(text)) stressors.push('考试与学业压力')
  if (/实习|找工作|求职|面试|就业/.test(text)) stressors.push('实习与求职压力')

  return stressors.length > 0 ? stressors.join('、') : '近期压力感较明显。'
}

function detectCommunicationPreference(userMessage) {
  const text = normalizeString(userMessage)
  if (!text) return ''

  const segments = [
    /温柔/.test(text) && '偏好温柔表达',
    /克制/.test(text) && '偏好克制表达',
    /记住上下文|记得上下文|记住我说的话|别忘|记性/.test(text) && '希望被稳定记住上下文',
    /陪伴感|陪着我|陪我/.test(text) && '希望有陪伴感'
  ].filter(Boolean)

  return segments.length > 0 ? segments.join('；') : ''
}

function detectIdentitySummary(userMessage) {
  const lifeStageSummary = detectLifeStageSummary(userMessage)
  const currentFocus = detectCurrentFocus(userMessage)

  if (lifeStageSummary && currentFocus) {
    return `${lifeStageSummary} 当前主要关注 ${currentFocus}。`
  }
  return lifeStageSummary || (currentFocus ? `当前主要关注 ${currentFocus}。` : '')
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
// 正则 buildCandidate 仅作为过渡期默认值，随 444 正则全面弃用后删除。
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

function buildCandidate(userMessage) {
  const userName = extractUserName(userMessage)
  const preferredName = extractPreferredName(userMessage)
  const cornieRelationship = extractCornieRelationship(userMessage)
  const identitySummary = detectIdentitySummary(userMessage)
  const lifeStageSummary = detectLifeStageSummary(userMessage)
  const currentFocus = detectCurrentFocus(userMessage)
  const stressors = detectStressors(userMessage)
  const communicationPreference = detectCommunicationPreference(userMessage)

  if (
    !userName &&
    !preferredName &&
    !cornieRelationship &&
    !identitySummary &&
    !lifeStageSummary &&
    !currentFocus &&
    !stressors &&
    !communicationPreference
  ) {
    return null
  }

  return {
    userName,
    preferredName,
    cornieRelationship,
    identitySummary,
    lifeStageSummary,
    currentFocus,
    stressors,
    communicationPreference
  }
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

export function extractIdentityProfileCandidate(userMessage) {
  return buildCandidate(userMessage)
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
  candidate = normalizeProfileCandidate(candidate) ?? buildCandidate(userMessage)
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
