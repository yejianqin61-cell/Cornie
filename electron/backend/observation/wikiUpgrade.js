import { createMemoryWikiGovernanceStore } from '../memory-wiki/index.js'
import { extractIdentityProfileCandidate } from '../identity/profileUpsert.js'
import { extractIdentityPreferenceCandidate } from '../identity/preferenceUpsert.js'
import { extractIdentityPersonCandidate } from '../identity/personUpsert.js'

function normalizeString(value) {
  return String(value ?? '').trim()
}

function buildObservationEvidence({ observation, userMessage, messageId }) {
  return {
    observationId: observation?.id ?? '',
    date: observation?.date ?? '',
    type: observation?.type ?? '',
    title: observation?.title ?? '',
    content: observation?.content ?? '',
    messageId: messageId ?? '',
    sourceText: normalizeString(userMessage).slice(0, 200)
  }
}

function sameObservationRequest(item, { requestType, observationId }) {
  if (!item || item.requestType !== requestType) return false
  if (!(item.status === 'pending' || item.status === 'deferred')) return false
  const evidence = Array.isArray(item.evidence) ? item.evidence : []
  return evidence.some((entry) => normalizeString(entry?.observationId) === normalizeString(observationId))
}

function toProfileRequest({ observation, userMessage, messageId, candidate }) {
  const labels = [candidate.userName, candidate.preferredName, candidate.cornieRelationship].filter(Boolean)
  return {
    requestType: 'identity_profile_upgrade_candidate',
    triggerSource: 'observation_upgrade',
    queueSection: 'wiki_upgrade_candidates',
    riskLevel: 'high',
    title: labels[0] || '主身份升级候选',
    reason: '观察日志中出现了高价值主身份线索，建议进入长期记忆升级审核，而不是仅停留在事实层。',
    evidence: [
      buildObservationEvidence({ observation, userMessage, messageId }),
      { candidateType: 'identity_profile', candidate }
    ],
    payload: {
      action: 'upgrade_identity_profile_from_observation',
      candidate
    }
  }
}

function toPreferenceRequest({ observation, userMessage, messageId, candidate }) {
  return {
    requestType: 'identity_preference_upgrade_candidate',
    triggerSource: 'observation_upgrade',
    queueSection: 'wiki_upgrade_candidates',
    riskLevel: 'medium',
    title: candidate.title || '偏好升级候选',
    reason: '观察日志中出现了可能对未来交互持续有影响的稳定偏好线索，建议进入长期记忆升级审核。',
    evidence: [
      buildObservationEvidence({ observation, userMessage, messageId }),
      { candidateType: 'identity_preference', candidate }
    ],
    payload: {
      action: 'upgrade_identity_preference_from_observation',
      candidate
    }
  }
}

function toPersonRequest({ observation, userMessage, messageId, candidate }) {
  return {
    requestType: 'identity_person_upgrade_candidate',
    triggerSource: 'observation_upgrade',
    queueSection: 'wiki_upgrade_candidates',
    riskLevel: 'high',
    title: candidate.personName || '重要人物升级候选',
    reason: '观察日志中出现了重要人物关系线索，建议进入长期记忆升级审核，而不是只留在当天事实层。',
    evidence: [
      buildObservationEvidence({ observation, userMessage, messageId }),
      { candidateType: 'identity_person', candidate }
    ],
    payload: {
      action: 'upgrade_identity_person_from_observation',
      candidate
    }
  }
}

export async function enqueueObservationWikiUpgradeCandidates(
  store,
  {
    baseDir = process.cwd(),
    observation,
    userMessage,
    messageId
  } = {}
) {
  if (!observation?.id || !normalizeString(userMessage)) {
    return { created: [], skipped: ['missing_observation_or_message'] }
  }

  const governanceStore = await createMemoryWikiGovernanceStore(baseDir)
  const existing = await governanceStore.list({
    queueSection: 'wiki_upgrade_candidates'
  })

  const requests = []
  const profileCandidate = extractIdentityProfileCandidate(userMessage)
  if (profileCandidate) {
    requests.push(toProfileRequest({ observation, userMessage, messageId, candidate: profileCandidate }))
  }

  const preferenceCandidate = extractIdentityPreferenceCandidate(userMessage)
  if (preferenceCandidate) {
    requests.push(toPreferenceRequest({ observation, userMessage, messageId, candidate: preferenceCandidate }))
  }

  const personCandidate = extractIdentityPersonCandidate(userMessage)
  if (personCandidate) {
    requests.push(toPersonRequest({ observation, userMessage, messageId, candidate: personCandidate }))
  }

  const created = []
  const skipped = []

  for (const request of requests) {
    if (sameObservationRequest(existing.find((item) => sameObservationRequest(item, {
      requestType: request.requestType,
      observationId: observation.id
    })), {
      requestType: request.requestType,
      observationId: observation.id
    })) {
      skipped.push(`${request.requestType}:duplicate_observation`)
      continue
    }

    const createdRequest = await governanceStore.create(request)
    existing.unshift(createdRequest)
    created.push(createdRequest)
  }

  return {
    created,
    skipped
  }
}
