import { createMemoryWikiService, createMemoryWikiAuditStore, MEMORY_WIKI_PAGE_TYPES } from '../memory-wiki/index.js'
import { createObservationService } from '../observation/service.js'
import { chat as deepseekChat } from '../model/deepseek/client.js'
import { buildMemoryDistillationPrompt } from './promptBuilder.js'
import { extractJsonCandidates } from './jsonProtocol.js'
import { upsertIdentityProfileFromConversation } from '../identity/profileUpsert.js'
import { upsertIdentityPreferenceFromConversation } from '../identity/preferenceUpsert.js'
import { upsertIdentityTraitFromConversation } from '../identity/traitUpsert.js'
import { upsertIdentityPersonFromConversation } from '../identity/personUpsert.js'

// 记忆提炼轮次（Memory Distillation Turn，443）：
// "是否计入记忆、记什么内容"的语义判定权交给 LLM，后端只负责执行与治理。
// 设计依据：Cornie-019 §6（写入侧）/ V1.1 决策（正则全面弃用，LLM 不可用即零写入）。
const MAX_DISTILLATION_REPAIR_RETRIES = 1
const DISTILLATION_RECENT_MESSAGES = 10
const DISTILLATION_MEMORY_PAGE_LIMIT = 6

const OBSERVATION_ACTIONS = new Set(['create', 'update', 'skip'])
const IDENTITY_ENTITIES = new Set(['profile', 'person', 'preference', 'trait'])
const IDENTITY_UPDATE_ACTIONS = new Set(['create', 'update', 'skip'])
const WIKI_ACTIONS = new Set([
  'create_page',
  'update_page',
  'merge_pages',
  'rollback_page',
  'archive_page',
  'delete_page'
])
const DESTRUCTIVE_WIKI_ACTIONS = new Set(['merge_pages', 'rollback_page', 'archive_page', 'delete_page'])
const IMPORTANCE_VALUES = new Set(['low', 'medium', 'high', 'critical'])
const VALID_PAGE_TYPES = new Set(MEMORY_WIKI_PAGE_TYPES)

function distillationProtocolError(message, details) {
  const error = new Error(message)
  error.code = 'invalid_memory_distillation'
  error.details = details
  return error
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function truncateAuditText(value, maxLength = 240) {
  const text = normalizeString(value)
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}…`
}

function buildRelatedRef({ date, messageId }) {
  const d = normalizeString(date)
  const id = normalizeString(messageId)
  return d && id ? `${d}#${id}` : d
}

function normalizeImportance(value) {
  const normalized = normalizeString(value).toLowerCase()
  return IMPORTANCE_VALUES.has(normalized) ? normalized : ''
}

function normalizePageType(value) {
  const normalized = normalizeString(value)
  return VALID_PAGE_TYPES.has(normalized) ? normalized : ''
}

// ---------- 输出 schema 校验 ----------

export function normalizeDistillationEnvelope(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw distillationProtocolError('model output must be a JSON object')
  }

  return {
    observations: normalizeObservationProposals(payload.observations),
    identity_updates: normalizeIdentityUpdateProposals(payload.identity_updates),
    memory_wiki_requests: normalizeWikiRequests(payload.memory_wiki_requests),
    reasoning: normalizeString(payload.reasoning).slice(0, 200)
  }
}

function normalizeObservationProposals(value) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) {
    throw distillationProtocolError('observations must be an array')
  }
  return value.map((item, index) => normalizeObservationProposal(item, index))
}

function normalizeObservationProposal(item, index) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw distillationProtocolError('observation proposal must be an object', { index })
  }

  const action = normalizeString(item.action)
  if (!OBSERVATION_ACTIONS.has(action)) {
    throw distillationProtocolError('unsupported observation action', { index, action })
  }

  const type = normalizeString(item.type) || 'misc'
  if (type.length > 20) {
    throw distillationProtocolError('observation type too long', { index })
  }

  const title = normalizeString(item.title)
  const content = normalizeString(item.content)
  const observationId = normalizeString(item.observationId ?? item.observation_id)

  if (action === 'create' && (!title || !content)) {
    throw distillationProtocolError('observation create requires title and content', { index })
  }
  if (action === 'update' && !observationId) {
    throw distillationProtocolError('observation update requires observationId', { index })
  }

  return { action, type, title, content, observationId }
}

function normalizeIdentityUpdateProposals(value) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) {
    throw distillationProtocolError('identity_updates must be an array')
  }
  return value.map((item, index) => normalizeIdentityUpdateProposal(item, index))
}

function normalizeIdentityUpdateProposal(item, index) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw distillationProtocolError('identity update proposal must be an object', { index })
  }

  const entity = normalizeString(item.entity)
  if (!IDENTITY_ENTITIES.has(entity)) {
    throw distillationProtocolError('unsupported identity entity', { index, entity })
  }

  const action = normalizeString(item.action)
  if (!IDENTITY_UPDATE_ACTIONS.has(action)) {
    throw distillationProtocolError('unsupported identity update action', { index, action })
  }

  const fields = item.fields ?? {}
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    throw distillationProtocolError('identity update fields must be an object', { index, entity })
  }

  return { entity, action, fields }
}

function normalizeWikiRequests(value) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) {
    throw distillationProtocolError('memory_wiki_requests must be an array')
  }
  return value.map((item, index) => normalizeWikiRequest(item, index))
}

function normalizeWikiRequest(item, index) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw distillationProtocolError('memory wiki request must be an object', { index })
  }

  const action = normalizeString(item.action)
  if (!WIKI_ACTIONS.has(action)) {
    throw distillationProtocolError('unsupported memory wiki request action', { index, action })
  }

  const pageType = normalizeString(item.pageType ?? item.page_type)
  if (pageType && !VALID_PAGE_TYPES.has(pageType)) {
    throw distillationProtocolError('unsupported memory wiki page type', { index, pageType })
  }

  return {
    action,
    pageType,
    title: normalizeString(item.title),
    summary: normalizeString(item.summary),
    body: normalizeString(item.body),
    importance: normalizeString(item.importance),
    pageId: normalizeString(item.pageId ?? item.page_id),
    targetPageId: normalizeString(item.targetPageId ?? item.target_page_id),
    sourcePageId: normalizeString(item.sourcePageId ?? item.source_page_id),
    versionId: normalizeString(item.versionId ?? item.version_id)
  }
}

// ---------- LLM 调用与解析 ----------

function parseDistillationJson(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw distillationProtocolError('model output is empty')
  }

  const candidates = extractJsonCandidates(text)
  const errors = []
  const seen = new Set()

  for (const candidate of candidates) {
    if (seen.has(candidate)) continue
    seen.add(candidate)

    try {
      return JSON.parse(candidate)
    } catch (error) {
      errors.push(error)
    }
  }

  const reason = errors[errors.length - 1]
  throw distillationProtocolError('failed to parse model JSON', {
    reason: reason?.message ?? 'unknown',
    rawText: text
  })
}

function buildDistillationRepairPrompt(rawText) {
  return [
    '你上一条回复不符合记忆提炼协议。',
    '请只输出一个合法 JSON 对象，不要输出解释、前后缀文字或 Markdown 代码块。',
    '字段要求：observations（action: create/update/skip）、identity_updates（entity: profile/person/preference/trait，action: create/update/skip）、memory_wiki_requests（action: create_page/update_page/merge_pages/rollback_page/archive_page/delete_page）、reasoning（不超过一句话）。',
    '以下是你上一条原始回复，请修复成合法 JSON：',
    String(rawText ?? '')
  ].join('\n')
}

async function requestDistillationEnvelope(messages, chatFn) {
  let attempts = 0
  let workingMessages = messages

  while (attempts <= MAX_DISTILLATION_REPAIR_RETRIES) {
    const response = await chatFn({ messages: workingMessages, temperature: 0.3, maxTokens: 700 })

    try {
      return normalizeDistillationEnvelope(parseDistillationJson(response?.content))
    } catch (error) {
      if (attempts >= MAX_DISTILLATION_REPAIR_RETRIES) {
        error.rawResponse = response?.content
        throw error
      }

      workingMessages = [
        ...workingMessages,
        { role: 'assistant', content: response?.content ?? '' },
        { role: 'user', content: buildDistillationRepairPrompt(response?.content) }
      ]
      attempts += 1
    }
  }

  throw new Error('memory distillation envelope request failed')
}

// ---------- 输入构建 ----------

async function buildDistillationInput({ store, baseDir, date, history = [], userMessage }) {
  const observation = createObservationService(store)

  const recentMessages = [
    ...(Array.isArray(history) ? history.slice(-DISTILLATION_RECENT_MESSAGES) : []),
    { role: 'user', content: userMessage }
  ]

  let todayObservations = []
  try {
    todayObservations = observation.listTodayForConversation(date)
  } catch (error) {
    console.error('[memory distillation] today observations load failed:', error)
  }

  let memorySummaryLines = []
  try {
    const memoryWiki = await createMemoryWikiService({ baseDir, store })
    const summaries = await memoryWiki.listSummaries({ status: 'active' })
    const primary = summaries.find((item) => item?.pageType === 'identity_profile')
    const rest = summaries
      .filter((item) => item?.pageId !== primary?.pageId)
      .slice(0, DISTILLATION_MEMORY_PAGE_LIMIT)

    if (primary) {
      memorySummaryLines.push(`- [identity] ${primary.title}: ${primary.summary || '暂无摘要'}`)
    }
    for (const summary of rest) {
      memorySummaryLines.push(`- [${summary.pageType}] ${summary.title}: ${summary.summary || '暂无摘要'}`)
    }
  } catch (error) {
    console.error('[memory distillation] memory summary load failed:', error)
  }

  return { recentMessages, todayObservations, memorySummaryLines }
}

// ---------- 三类提议执行 ----------

async function applyDistilledObservations(observation, proposals, { date, messageId }) {
  const results = []

  for (const proposal of proposals) {
    if (proposal.action === 'skip') {
      results.push({ action: 'skipped', reason: 'llm_skip' })
      continue
    }

    if (proposal.action === 'update') {
      const id = proposal.observationId
      if (!id) {
        results.push({ action: 'skipped', reason: 'missing_observation_id' })
        continue
      }
      const existing = observation.get(id)
      if (!existing) {
        results.push({ action: 'skipped', reason: 'observation_not_found' })
        continue
      }
      try {
        observation.updateNote({
          id,
          type: proposal.type || existing.type,
          title: proposal.title || existing.title,
          content: proposal.content || existing.content
        })
        results.push({ action: 'updated', observationId: id })
      } catch (error) {
        results.push({ action: 'skipped', reason: 'update_failed', error: String(error?.message || error) })
      }
      continue
    }

    if (!proposal.title || !proposal.content) {
      results.push({ action: 'skipped', reason: 'missing_title_or_content' })
      continue
    }

    try {
      const outcome = observation.addNoteSmart({
        date,
        type: proposal.type || 'misc',
        title: proposal.title,
        content: proposal.content,
        relatedRef: buildRelatedRef({ date, messageId }),
        sourceText: proposal.content
      })
      results.push({ action: outcome.action, observationId: outcome.note?.id ?? null })
    } catch (error) {
      results.push({ action: 'skipped', reason: 'create_failed', error: String(error?.message || error) })
    }
  }

  return results
}

async function applyDistilledIdentityUpdates(store, { baseDir, date, messageId, userMessage, proposals }) {
  const results = []
  const baseOptions = { baseDir, date, messageId, userMessage }

  for (const proposal of proposals) {
    const { entity, action, fields } = proposal

    if (action === 'skip') {
      results.push({ action: 'skipped', entity, reason: 'llm_skip' })
      continue
    }

    let result = null
    try {
      if (entity === 'profile') {
        result = await upsertIdentityProfileFromConversation(store, { ...baseOptions, candidate: fields })
      } else if (entity === 'person') {
        result = await upsertIdentityPersonFromConversation(store, { ...baseOptions, candidate: fields })
      } else if (entity === 'preference') {
        result = await upsertIdentityPreferenceFromConversation(store, { ...baseOptions, candidate: fields })
      } else if (entity === 'trait') {
        result = await upsertIdentityTraitFromConversation(store, { ...baseOptions, candidate: fields })
      }
    } catch (error) {
      results.push({ action: 'skipped', entity, reason: 'upsert_failed', error: String(error?.message || error) })
      continue
    }

    if (!result) {
      results.push({ action: 'skipped', entity, reason: 'no_result' })
      continue
    }

    results.push({
      action: result.action || 'unknown',
      entity,
      ...(result.pageId ? { pageId: result.pageId } : {}),
      ...(Array.isArray(result.conflicts) && result.conflicts.length > 0 ? { conflicts: result.conflicts } : {})
    })
  }

  return results
}

async function applyDistilledWikiRequests(memoryWiki, requests) {
  const results = []

  for (const request of requests) {
    if (DESTRUCTIVE_WIKI_ACTIONS.has(request.action)) {
      try {
        await memoryWiki.createGovernanceRequest({
          requestType: 'memory_wiki_llm_proposal',
          triggerSource: 'memory_distillation',
          queueSection: 'memory_wiki_llm_proposals',
          riskLevel: 'high',
          pageIds: [request.pageId || request.targetPageId || ''].filter(Boolean),
          title: request.title || 'LLM 提议的长期记忆变更',
          reason: '记忆提炼轮次中 LLM 提议了破坏性长期记忆变更，等待人类审核后再执行。',
          evidence: [request],
          payload: { action: request.action, request }
        })
        results.push({ action: 'deferred_to_governance', wikiAction: request.action })
      } catch (error) {
        results.push({ action: 'skipped', reason: 'governance_enqueue_failed', error: String(error?.message || error) })
      }
      continue
    }

    if (request.action === 'create_page') {
      const pageType = normalizePageType(request.pageType)
      if (!pageType) {
        results.push({ action: 'skipped', wikiAction: 'create_page', reason: 'invalid_page_type' })
        continue
      }
      if (!request.title) {
        results.push({ action: 'skipped', wikiAction: 'create_page', reason: 'title_required' })
        continue
      }
      try {
        const created = await memoryWiki.create({
          pageType,
          title: request.title,
          summary: request.summary,
          body: request.body,
          importance: normalizeImportance(request.importance) || 'medium',
          ownerConfirmed: false
        })
        results.push({ action: 'created', wikiAction: 'create_page', pageId: created.pageId })
      } catch (error) {
        results.push({ action: 'skipped', wikiAction: 'create_page', reason: 'create_failed', error: String(error?.message || error) })
      }
      continue
    }

    if (request.action === 'update_page') {
      const pageId = request.pageId
      if (!pageId) {
        results.push({ action: 'skipped', wikiAction: 'update_page', reason: 'page_id_required' })
        continue
      }
      let existing = null
      try {
        existing = await memoryWiki.get(pageId)
      } catch {}
      if (!existing) {
        results.push({ action: 'skipped', wikiAction: 'update_page', reason: 'page_not_found' })
        continue
      }
      try {
        const updated = await memoryWiki.update({
          ...existing,
          pageId: existing.pageId,
          title: request.title || existing.title,
          summary: request.summary || existing.summary,
          body: request.body || existing.body,
          importance: normalizeImportance(request.importance) || existing.importance
        })
        results.push({ action: 'updated', wikiAction: 'update_page', pageId: updated.pageId })
      } catch (error) {
        results.push({ action: 'skipped', wikiAction: 'update_page', reason: 'update_failed', error: String(error?.message || error) })
      }
      continue
    }

    results.push({ action: 'skipped', wikiAction: request.action, reason: 'unsupported_action' })
  }

  return results
}

async function executeDistillationEnvelope({ store, baseDir, date, userMessage, messageId, envelope }) {
  const observation = createObservationService(store)
  const memoryWiki = await createMemoryWikiService({ baseDir, store })

  const observations = await applyDistilledObservations(observation, envelope.observations, { date, messageId })
  const identityUpdates = await applyDistilledIdentityUpdates(store, {
    baseDir,
    date,
    messageId,
    userMessage,
    proposals: envelope.identity_updates
  })
  const wikiRequests = await applyDistilledWikiRequests(memoryWiki, envelope.memory_wiki_requests)

  return { observations, identityUpdates, wikiRequests }
}

// ---------- 主入口 ----------

export async function runMemoryDistillation({
  store,
  baseDir = process.cwd(),
  date,
  userMessage,
  cornieMessage,
  messageId,
  history = [],
  chatFn = null
} = {}) {
  const startedAt = Date.now()
  const auditStore = await createMemoryWikiAuditStore(baseDir)

  let envelope = null
  let llmError = null
  try {
    const input = await buildDistillationInput({ store, baseDir, date, history, userMessage })
    const prompt = buildMemoryDistillationPrompt({
      date,
      recentMessages: input.recentMessages,
      todayObservations: input.todayObservations,
      memorySummaryLines: input.memorySummaryLines
    })
    const chat = typeof chatFn === 'function' ? chatFn : deepseekChat
    envelope = await requestDistillationEnvelope([{ role: 'system', content: prompt }], chat)
  } catch (error) {
    llmError = error
  }

  // V1.1 决策：LLM 不可用时本轮零写入记忆，不做正则兜底，仅记录审计。
  if (!envelope) {
    const fallbackReason = String(llmError?.code || llmError?.message || 'llm_failed')
    try {
      await auditStore.append({
        eventType: 'memory_distillation',
        pageId: null,
        reason: truncateAuditText(`unavailable: ${fallbackReason}`),
        details: { source: 'unavailable', date, fallbackReason, durationMs: Date.now() - startedAt }
      })
    } catch {}
    return { decisionSource: 'unavailable', reason: fallbackReason, durationMs: Date.now() - startedAt }
  }

  const results = await executeDistillationEnvelope({ store, baseDir, date, userMessage, messageId, envelope })

  try {
    await auditStore.append({
      eventType: 'memory_distillation',
      pageId: null,
      reason: truncateAuditText(envelope.reasoning || 'llm 决策'),
      details: {
        source: 'llm',
        date,
        proposed: {
          observations: envelope.observations.length,
          identityUpdates: envelope.identity_updates.length,
          wikiRequests: envelope.memory_wiki_requests.length
        },
        applied: {
          observations: results.observations.filter((item) => item.action !== 'skipped').length,
          identityUpdates: results.identityUpdates.filter((item) => item.action !== 'skipped').length,
          wikiRequests: results.wikiRequests.filter(
            (item) => item.action !== 'skipped' && item.action !== 'deferred_to_governance'
          ).length
        },
        skipped: {
          observations: results.observations.filter((item) => item.action === 'skipped').length,
          identityUpdates: results.identityUpdates.filter((item) => item.action === 'skipped').length,
          wikiRequests: results.wikiRequests.filter((item) => item.action === 'skipped').length
        },
        durationMs: Date.now() - startedAt,
        results
      }
    })
  } catch {}

  return { decisionSource: 'llm', envelope, results, durationMs: Date.now() - startedAt }
}
