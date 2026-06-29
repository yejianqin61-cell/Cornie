import { createMemoryWikiService, createTopicIndexStore } from '../memory-wiki/index.js'

const IDENTITY_PERSON_PAGE_TYPE = 'identity_person'
const IDENTITY_PROFILE_PAGE_TYPE = 'identity_profile'

function normalizeString(value) {
  return String(value ?? '').trim()
}

function normalizeCompare(value) {
  return normalizeString(value).replace(/\s+/g, ' ').toLowerCase()
}

function stripTrailingParticles(value) {
  return normalizeString(value).replace(/[。，！!？?,，、；;：:“”"'`~\s]+$/g, '').trim()
}

function dedupeStrings(items = []) {
  return Array.from(new Set(items.map((item) => normalizeString(item)).filter(Boolean)))
}

function normalizeKey(value) {
  return normalizeString(value).toLowerCase()
}

function buildSourceRef({ date, messageId, userMessage }) {
  return {
    kind: 'chat',
    date,
    messageId,
    title: stripTrailingParticles(normalizeString(userMessage).slice(0, 24)) || '人物记忆来源',
    excerpt: normalizeString(userMessage).slice(0, 120)
  }
}

function buildChatRef({ date, messageId }) {
  return `${normalizeString(date)}#${normalizeString(messageId)}`
}

function cleanupPersonName(value) {
  const cleaned = stripTrailingParticles(value)
  if (!cleaned || cleaned.length > 24) return ''

  const blocked = new Set([
    '我',
    '你',
    '他',
    '她',
    '它',
    '我们',
    '你们',
    '他们',
    '她们',
    '一个人',
    '路人',
    '别人',
    '同学',
    '朋友',
    '家人',
    '老师',
    '导师',
    '爸爸',
    '妈妈'
  ])

  return blocked.has(cleaned) ? '' : cleaned
}

function normalizeRelationship(rawRelationship) {
  const value = normalizeString(rawRelationship)
  const map = new Map([
    ['初恋', '初恋'],
    ['前任', '前任'],
    ['朋友', '朋友'],
    ['家人', '家人'],
    ['同学', '同学'],
    ['导师', '导师'],
    ['老师', '老师'],
    ['同事', '同事'],
    ['女朋友', '恋人'],
    ['男朋友', '恋人'],
    ['恋人', '恋人']
  ])
  return map.get(value) || value
}

function buildRoleSummary(relationshipToUser) {
  const relationship = normalizeRelationship(relationshipToUser)
  const map = new Map([
    ['初恋', '在用户人生中具有高情感权重的重要人物。'],
    ['前任', '在用户人生叙事中占据重要位置的过往关系人物。'],
    ['恋人', '与用户有亲密关系的重要人物。'],
    ['家人', '与用户有长期稳定亲缘关系的重要人物。'],
    ['朋友', '与用户有持续互动和情感联系的重要朋友。'],
    ['同学', '与用户学习阶段经历紧密相关的人物。'],
    ['导师', '在用户成长或学习路径中有指导意义的人物。'],
    ['老师', '在用户成长或学习路径中有指导意义的人物。'],
    ['同事', '在用户工作或项目阶段中有持续关联的人物。']
  ])
  return map.get(relationship) || ''
}

function buildEmotionalWeight(relationshipToUser) {
  const relationship = normalizeRelationship(relationshipToUser)
  if (relationship === '初恋' || relationship === '前任' || relationship === '恋人') {
    return 'high'
  }
  if (relationship === '家人' || relationship === '导师') {
    return 'medium'
  }
  return ''
}

function extractExperienceSummary(text) {
  const normalized = normalizeString(text)
  if (!normalized) return ''

  if (/\d{4}年/.test(normalized)) {
    return stripTrailingParticles(normalized.slice(0, 80))
  }

  return ''
}

function extractTimelineSummary(text) {
  const normalized = normalizeString(text)
  if (!normalized) return ''

  const segments = normalized.match(/\d{4}年[^，。！？；,!?]{0,16}/g)
  if (!segments || segments.length === 0) {
    return ''
  }

  return stripTrailingParticles(segments.slice(0, 3).join('；'))
}

function buildCandidate(userMessage) {
  const text = normalizeString(userMessage)
  if (!text) return null

  const patterns = [
    /我的(初恋|前任|朋友|家人|同学|导师|老师|同事|女朋友|男朋友)名字叫([^\s，。！？；,!?]{2,24})/,
    /我的(初恋|前任|朋友|家人|同学|导师|老师|同事|女朋友|男朋友)叫([^\s，。！？；,!?]{2,24})/,
    /([^\s，。！？；,!?]{2,24})是我的(初恋|前任|朋友|家人|同学|导师|老师|同事|女朋友|男朋友)/,
    /([^\s，。！？；,!?]{2,24})是我(初恋|前任|朋友|家人|同学|导师|老师|同事|女朋友|男朋友)/
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match) continue

    const relationshipToUser =
      pattern === patterns[0] || pattern === patterns[1]
        ? normalizeRelationship(match[1])
        : normalizeRelationship(match[2])
    const personName =
      pattern === patterns[0] || pattern === patterns[1]
        ? cleanupPersonName(match[2])
        : cleanupPersonName(match[1])

    if (!personName || !relationshipToUser) {
      continue
    }

    return {
      personName,
      relationshipToUser,
      roleSummary: buildRoleSummary(relationshipToUser),
      sharedExperienceSummary: extractExperienceSummary(text),
      timelineSummary: extractTimelineSummary(text),
      emotionalWeight: buildEmotionalWeight(relationshipToUser),
      firstKnownPeriod: extractTimelineSummary(text).split('；')[0] || ''
    }
  }

  return null
}

function samePerson(page, candidate) {
  const pageNames = dedupeStrings([page.title, page.personName, ...(Array.isArray(page.aliases) ? page.aliases : [])])
  return pageNames.some((item) => normalizeCompare(item) === normalizeCompare(candidate.personName))
}

async function findMatchingPersonPage(memoryWiki, candidate) {
  const summaries = await memoryWiki.listSummaries({
    pageType: IDENTITY_PERSON_PAGE_TYPE,
    status: 'active'
  })

  for (const summary of summaries) {
    const page = summary?.pageId ? await memoryWiki.get(summary.pageId) : null
    if (page && samePerson(page, candidate)) {
      return page
    }
  }

  return null
}

async function getPrimaryIdentityProfile(memoryWiki) {
  const summaries = await memoryWiki.listSummaries({
    pageType: IDENTITY_PROFILE_PAGE_TYPE,
    status: 'active'
  })
  if (!Array.isArray(summaries) || summaries.length === 0) {
    return null
  }
  return summaries[0]?.pageId ? memoryWiki.get(summaries[0].pageId) : null
}

function createConflict(field, existingValue, incomingValue) {
  return {
    field,
    existingValue: normalizeString(existingValue),
    incomingValue: normalizeString(incomingValue)
  }
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

async function ensureProfileLink(memoryWiki, personPageId) {
  const profile = await getPrimaryIdentityProfile(memoryWiki)
  if (!profile?.pageId || profile.pageId === personPageId) {
    return
  }

  const profileRelated = Array.isArray(profile.relatedPageIds) ? profile.relatedPageIds : []
  if (!profileRelated.includes(personPageId)) {
    await memoryWiki.linkRelatedPages(profile.pageId, [...profileRelated, personPageId])
  }

  const personPage = await memoryWiki.get(personPageId)
  const personRelated = Array.isArray(personPage?.relatedPageIds) ? personPage.relatedPageIds : []
  if (personPage && !personRelated.includes(profile.pageId)) {
    await memoryWiki.linkRelatedPages(personPageId, [...personRelated, profile.pageId])
  }
}

async function ensurePersonTopicLink({ baseDir, page, date, messageId, personName }) {
  if (!page?.pageId) {
    return null
  }

  const keyword = normalizeString(personName) || normalizeString(page.personName) || normalizeString(page.title)
  const normalizedKey = normalizeKey(keyword)
  if (!normalizedKey) {
    return null
  }

  const topicIndex = await createTopicIndexStore(baseDir)
  const existing = await topicIndex.get(normalizedKey)
  const aliases = dedupeStrings([
    keyword,
    page.title,
    page.personName,
    ...(Array.isArray(page.aliases) ? page.aliases : [])
  ])

  await topicIndex.upsert({
    ...(existing ?? {}),
    keyword: existing?.keyword || keyword,
    normalizedKey,
    aliases: dedupeStrings([...(existing?.aliases ?? []), ...aliases]),
    importance: page.importance || existing?.importance || 'medium',
    note: page.summary || existing?.note || '',
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

export function extractIdentityPersonCandidate(userMessage) {
  return buildCandidate(userMessage)
}

export async function upsertIdentityPersonFromConversation(
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
  const existingPage = await findMatchingPersonPage(memoryWiki, candidate)
  const sourceRef = buildSourceRef({ date, messageId, userMessage })

  if (!existingPage) {
    const created = await memoryWiki.create({
      pageType: IDENTITY_PERSON_PAGE_TYPE,
      title: candidate.personName,
      personName: candidate.personName,
      relationshipToUser: candidate.relationshipToUser,
      roleSummary: candidate.roleSummary,
      sharedExperienceSummary: candidate.sharedExperienceSummary,
      timelineSummary: candidate.timelineSummary,
      emotionalWeight: candidate.emotionalWeight,
      firstKnownPeriod: candidate.firstKnownPeriod,
      aliases: dedupeStrings([candidate.personName]),
      importance: candidate.emotionalWeight === 'high' ? 'high' : 'medium',
      ownerConfirmed: false,
      lastMentionedAt: date,
      sourceRefs: [sourceRef]
    })

    await ensureProfileLink(memoryWiki, created.pageId)
    await ensurePersonTopicLink({
      baseDir,
      page: created,
      date,
      messageId,
      personName: candidate.personName
    })

    return {
      action: 'created',
      pageId: created.pageId,
      candidate,
      conflicts: []
    }
  }

  const conflicts = []
  const updates = {
    pageId: existingPage.pageId,
    lastMentionedAt: date
  }

  compareField(existingPage.relationshipToUser, candidate.relationshipToUser, 'relationshipToUser', conflicts, updates)
  compareField(existingPage.roleSummary, candidate.roleSummary, 'roleSummary', conflicts, updates)
  compareField(existingPage.emotionalWeight, candidate.emotionalWeight, 'emotionalWeight', conflicts, updates)

  if (!normalizeString(existingPage.sharedExperienceSummary) && normalizeString(candidate.sharedExperienceSummary)) {
    updates.sharedExperienceSummary = candidate.sharedExperienceSummary
  }
  if (!normalizeString(existingPage.timelineSummary) && normalizeString(candidate.timelineSummary)) {
    updates.timelineSummary = candidate.timelineSummary
  }
  if (!normalizeString(existingPage.firstKnownPeriod) && normalizeString(candidate.firstKnownPeriod)) {
    updates.firstKnownPeriod = candidate.firstKnownPeriod
  }

  const aliases = dedupeStrings([...(Array.isArray(existingPage.aliases) ? existingPage.aliases : []), candidate.personName])
  if (aliases.length !== (existingPage.aliases?.length || 0) || aliases.some((item, index) => item !== existingPage.aliases?.[index])) {
    updates.aliases = aliases
  }

  const sourceRefs = Array.isArray(existingPage.sourceRefs) ? existingPage.sourceRefs : []
  const hasSameSource = sourceRefs.some(
    (item) =>
      normalizeString(item?.kind) === 'chat' &&
      normalizeString(item?.date) === normalizeString(sourceRef.date) &&
      normalizeString(item?.messageId) === normalizeString(sourceRef.messageId)
  )
  if (!hasSameSource) {
    updates.sourceRefs = [...sourceRefs, sourceRef]
  }

  if (conflicts.length > 0) {
    if (!hasSameSource) {
      await memoryWiki.update({
        ...existingPage,
        sourceRefs: updates.sourceRefs,
        lastMentionedAt: date,
        pageId: existingPage.pageId
      })
    }
    await ensureProfileLink(memoryWiki, existingPage.pageId)
    await ensurePersonTopicLink({
      baseDir,
      page: {
        ...existingPage,
        sourceRefs: updates.sourceRefs,
        lastMentionedAt: date
      },
      date,
      messageId,
      personName: candidate.personName
    })

    return {
      action: 'conflict',
      pageId: existingPage.pageId,
      candidate,
      conflicts
    }
  }

  const updated = await memoryWiki.update({
    ...existingPage,
    ...updates,
    pageId: existingPage.pageId
  })

  await ensureProfileLink(memoryWiki, updated.pageId)
  await ensurePersonTopicLink({
    baseDir,
    page: updated,
    date,
    messageId,
    personName: candidate.personName
  })

  return {
    action: hasSameSource ? 'noop' : 'updated',
    pageId: updated.pageId,
    candidate,
    conflicts: []
  }
}
