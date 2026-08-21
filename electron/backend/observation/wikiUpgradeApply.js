import { getMessagesByDate, getObservationLog } from '../../db.js'
import { createMemoryWikiGovernanceStore, createMemoryWikiService } from '../memory-wiki/index.js'
import { upsertIdentityProfileFromConversation } from '../identity/profileUpsert.js'
import { upsertIdentityPreferenceFromConversation } from '../identity/preferenceUpsert.js'
import { upsertIdentityTraitFromConversation } from '../identity/traitUpsert.js'
import { upsertIdentityPersonFromConversation } from '../identity/personUpsert.js'

function normalizeString(value) {
  return String(value ?? '').trim()
}

function extractObservationEvidence(request) {
  const evidence = Array.isArray(request?.evidence) ? request.evidence : []
  return evidence.find((item) => normalizeString(item?.observationId)) ?? null
}

function resolveConversationSource(store, request, observationEvidence) {
  const date = normalizeString(observationEvidence?.date)
  const messageId = normalizeString(observationEvidence?.messageId)
  const sourceText = normalizeString(observationEvidence?.sourceText)

  if (date && messageId && store) {
    const messages = getMessagesByDate(store, date)
    const matched = messages.find((item) => normalizeString(item?.id) === messageId)
    if (matched?.content) {
      return {
        date,
        messageId,
        userMessage: normalizeString(matched.content)
      }
    }
  }

  if (sourceText) {
    return {
      date,
      messageId,
      userMessage: sourceText
    }
  }

  const payloadCandidate = request?.payload?.candidate
  if (payloadCandidate && typeof payloadCandidate === 'object') {
    return {
      date,
      messageId,
      userMessage: JSON.stringify(payloadCandidate, null, 2)
    }
  }

  return {
    date,
    messageId,
    userMessage: ''
  }
}

function buildObservationSourceRef(observation) {
  if (!observation?.id) {
    return null
  }

  return {
    kind: 'observation',
    observationId: normalizeString(observation.id),
    date: normalizeString(observation.date),
    title: normalizeString(observation.title),
    type: normalizeString(observation.type)
  }
}

async function applyOwnerConfirmed(memoryWiki, pageId) {
  const page = await memoryWiki.get(pageId)
  if (!page) {
    throw new Error(`memory wiki page not found after upgrade apply: ${pageId}`)
  }

  const shouldActivateTrait =
    normalizeString(page.pageType) === 'identity_trait' &&
    normalizeString(page.status) === 'review'

  if (page.ownerConfirmed === true && !shouldActivateTrait) {
    return page
  }

  return memoryWiki.update({
    ...page,
    pageId,
    ownerConfirmed: true,
    status: shouldActivateTrait ? 'active' : page.status
  })
}

async function appendObservationSource(memoryWiki, pageId, observation) {
  const observationSourceRef = buildObservationSourceRef(observation)
  if (!observationSourceRef) {
    return null
  }
  return memoryWiki.addSourceRef(pageId, observationSourceRef)
}

async function dispatchUpgradeAction(store, request, { baseDir, observation, date, messageId, userMessage }) {
  const action = normalizeString(request?.payload?.action)
  // 446：治理请求的 candidate 直接来自提炼轮次 payload；
  // 无 candidate 时交由 upsert 决定（正则退场后即 skipped）。
  const candidate = request?.payload?.candidate

  if (action === 'upgrade_identity_profile_from_observation') {
    return upsertIdentityProfileFromConversation(store, {
      baseDir,
      date,
      messageId,
      userMessage,
      candidate
    })
  }

  if (action === 'upgrade_identity_preference_from_observation') {
    return upsertIdentityPreferenceFromConversation(store, {
      baseDir,
      date,
      messageId,
      userMessage,
      candidate
    })
  }

  if (action === 'upgrade_identity_trait_from_observation') {
    return upsertIdentityTraitFromConversation(store, {
      baseDir,
      date,
      messageId,
      userMessage,
      candidate
    })
  }

  if (action === 'upgrade_identity_person_from_observation') {
    return upsertIdentityPersonFromConversation(store, {
      baseDir,
      date,
      messageId,
      userMessage,
      observation,
      candidate
    })
  }

  throw new Error(`unsupported observation wiki upgrade action: ${action}`)
}

export async function applyObservationWikiUpgradeRequest(
  store,
  {
    baseDir = process.cwd(),
    requestId
  } = {}
) {
  if (!requestId) {
    throw new Error('observation wiki upgrade requestId is required')
  }

  const governanceStore = await createMemoryWikiGovernanceStore(baseDir)
  const request = await governanceStore.get(requestId)
  if (!request) {
    throw new Error(`governance request not found: ${requestId}`)
  }

  if (normalizeString(request.queueSection) !== 'wiki_upgrade_candidates') {
    throw new Error(`governance request is not a wiki upgrade candidate: ${requestId}`)
  }

  if (!['pending', 'deferred'].includes(normalizeString(request.status))) {
    throw new Error(`governance request cannot be applied from status: ${request.status}`)
  }

  const observationEvidence = extractObservationEvidence(request)
  const observationId = normalizeString(observationEvidence?.observationId)
  const observation = observationId && store ? getObservationLog(store, observationId) : null
  const conversationSource = resolveConversationSource(store, request, observationEvidence)
  const date = normalizeString(conversationSource.date || observation?.date)
  const messageId = normalizeString(conversationSource.messageId)
  const userMessage = normalizeString(conversationSource.userMessage)

  if (!userMessage) {
    throw new Error(`observation wiki upgrade request missing source text: ${requestId}`)
  }

  const applyResult = await dispatchUpgradeAction(store, request, {
    baseDir,
    observation,
    date,
    messageId,
    userMessage
  })

  if (!normalizeString(applyResult?.pageId)) {
    throw new Error(`observation wiki upgrade apply did not produce pageId: ${requestId}`)
  }

  const memoryWiki = await createMemoryWikiService({ baseDir, store })
  const confirmedPage = await applyOwnerConfirmed(memoryWiki, applyResult.pageId)
  await appendObservationSource(memoryWiki, confirmedPage.pageId, observation)
  const approvedRequest = await governanceStore.updateStatus(requestId, 'approved')
  const finalPage = await memoryWiki.get(confirmedPage.pageId)

  return {
    request: approvedRequest,
    applyResult,
    page: finalPage
  }
}
