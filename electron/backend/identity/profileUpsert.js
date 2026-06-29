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
  compareField(existingPage.identitySummary, candidate.identitySummary, 'identitySummary', conflicts, updates)
  compareField(existingPage.lifeStageSummary, candidate.lifeStageSummary, 'lifeStageSummary', conflicts, updates)
  compareField(existingPage.currentFocus, candidate.currentFocus, 'currentFocus', conflicts, updates)
  compareField(existingPage.stressors, candidate.stressors, 'stressors', conflicts, updates)
  compareField(existingPage.communicationPreference, candidate.communicationPreference, 'communicationPreference', conflicts, updates)

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
