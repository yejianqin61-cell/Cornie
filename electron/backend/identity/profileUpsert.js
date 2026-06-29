import { createMemoryWikiService } from '../memory-wiki/index.js'

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

function buildSourceRef({ date, messageId, userMessage }) {
  return {
    kind: 'chat',
    date,
    messageId,
    title: stripTrailingParticles(normalizeString(userMessage).slice(0, 24)) || '身份记忆来源',
    excerpt: normalizeString(userMessage).slice(0, 120)
  }
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

function buildCandidate(userMessage) {
  const userName = extractUserName(userMessage)
  const preferredName = extractPreferredName(userMessage)
  const cornieRelationship = extractCornieRelationship(userMessage)

  if (!userName && !preferredName && !cornieRelationship) {
    return null
  }

  return {
    userName,
    preferredName,
    cornieRelationship
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

export function extractIdentityProfileCandidate(userMessage) {
  return buildCandidate(userMessage)
}

export async function upsertIdentityProfileFromConversation(
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
      aliases: mergeAliases(null, [candidate.userName, candidate.preferredName]),
      importance: 'critical',
      ownerConfirmed: false,
      sourceRefs: [sourceRef]
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

  return {
    action: 'updated',
    pageId: updated.pageId,
    candidate,
    conflicts: []
  }
}
