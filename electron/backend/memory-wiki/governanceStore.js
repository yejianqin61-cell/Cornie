import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { resolveMemoryWikiRoot } from './constants.js'

const GOVERNANCE_SEGMENTS = ['governance']
const GOVERNANCE_FILENAME = 'review-queue.json'

const REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'deferred']

// 459：治理状态机显式转移图。其余转移一律拒绝并报错。
const REQUEST_STATUS_TRANSITIONS = Object.freeze({
  pending: ['approved', 'rejected', 'deferred'],
  deferred: ['pending', 'rejected']
})

function normalizeString(value) {
  return String(value ?? '').trim()
}

function assertStatusTransition(currentStatus, nextStatus) {
  const allowed = REQUEST_STATUS_TRANSITIONS[currentStatus]
  if (!allowed || !allowed.includes(nextStatus)) {
    throw new Error(`illegal governance status transition: ${currentStatus} -> ${nextStatus}`)
  }
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => normalizeString(item)).filter(Boolean)
}

function normalizeEvidence(value) {
  return Array.isArray(value) ? value : []
}

function normalizeRequestStatus(value) {
  const normalized = normalizeString(value) || 'pending'
  if (!REQUEST_STATUSES.includes(normalized)) {
    throw new Error(`unsupported governance request status: ${normalized}`)
  }
  return normalized
}

export function createGovernanceRequest(input = {}) {
  const now = new Date().toISOString()
  return {
    requestId: normalizeString(input.requestId ?? input.request_id) || `gov_${randomUUID().slice(0, 12)}`,
    requestType: normalizeString(input.requestType ?? input.request_type),
    triggerSource: normalizeString(input.triggerSource ?? input.trigger_source),
    queueSection: normalizeString(input.queueSection ?? input.queue_section) || 'repair_suggestions',
    status: normalizeRequestStatus(input.status),
    riskLevel: normalizeString(input.riskLevel ?? input.risk_level) || 'high',
    pageIds: normalizeStringArray(input.pageIds ?? input.page_ids),
    topicKeys: normalizeStringArray(input.topicKeys ?? input.topic_keys),
    title: normalizeString(input.title),
    reason: normalizeString(input.reason),
    evidence: normalizeEvidence(input.evidence),
    payload: input.payload && typeof input.payload === 'object' ? input.payload : {},
    createdAt: normalizeString(input.createdAt ?? input.created_at) || now,
    updatedAt: normalizeString(input.updatedAt ?? input.updated_at) || now
  }
}

function resolveGovernanceDir(baseDir) {
  return path.join(resolveMemoryWikiRoot(baseDir), ...GOVERNANCE_SEGMENTS)
}

async function ensureJsonFile(filePath, fallbackValue) {
  try {
    await fs.access(filePath)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    await fs.writeFile(filePath, JSON.stringify(fallbackValue, null, 2), 'utf8')
  }
}

export async function createMemoryWikiGovernanceStore(baseDir) {
  const governanceDir = resolveGovernanceDir(baseDir)
  await fs.mkdir(governanceDir, { recursive: true })
  const filePath = path.join(governanceDir, GOVERNANCE_FILENAME)
  await ensureJsonFile(filePath, [])

  async function readAll() {
    const text = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed.map((item) => createGovernanceRequest(item)) : []
  }

  async function writeAll(items) {
    await fs.writeFile(filePath, JSON.stringify(items, null, 2), 'utf8')
  }

  return {
    async create(input) {
      const request = createGovernanceRequest(input)
      const items = await readAll()
      items.push(request)
      await writeAll(items)
      return request
    },

    async get(requestId) {
      const normalizedId = normalizeString(requestId)
      if (!normalizedId) return null
      const items = await readAll()
      return items.find((item) => item.requestId === normalizedId) ?? null
    },

    async list({ status, requestType, triggerSource, queueSection } = {}) {
      const normalizedStatus = status ? normalizeString(status) : ''
      const normalizedRequestType = requestType ? normalizeString(requestType) : ''
      const normalizedTriggerSource = triggerSource ? normalizeString(triggerSource) : ''
      const normalizedQueueSection = queueSection ? normalizeString(queueSection) : ''

      const items = await readAll()
      return items
        .filter((item) => {
          if (normalizedStatus && item.status !== normalizedStatus) return false
          if (normalizedRequestType && item.requestType !== normalizedRequestType) return false
          if (normalizedTriggerSource && item.triggerSource !== normalizedTriggerSource) return false
          if (normalizedQueueSection && item.queueSection !== normalizedQueueSection) return false
          return true
        })
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    },

    async updateStatus(requestId, status) {
      const normalizedId = normalizeString(requestId)
      const normalizedStatus = normalizeRequestStatus(status)
      const items = await readAll()
      const index = items.findIndex((item) => item.requestId === normalizedId)
      if (index === -1) {
        throw new Error(`governance request not found: ${normalizedId}`)
      }

      assertStatusTransition(items[index].status, normalizedStatus)

      const next = createGovernanceRequest({
        ...items[index],
        status: normalizedStatus,
        updatedAt: new Date().toISOString()
      })
      items[index] = next
      await writeAll(items)
      return next
    },

    // 459：deferred 复活为 pending（唯一合法的复活路径）。
    async reactivateDeferred(requestId) {
      return this.updateStatus(requestId, 'pending')
    },

    getFilePath() {
      return filePath
    }
  }
}
