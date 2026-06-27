import fs from 'node:fs/promises'
import path from 'node:path'
import { resolveMemoryWikiRoot } from './constants.js'

const AUDIT_SEGMENTS = ['audit']
const AUDIT_FILENAME = 'events.jsonl'

function normalizeString(value) {
  return String(value ?? '').trim()
}

function truncate(value, maxLength = 240) {
  const text = normalizeString(value)
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

function resolveAuditDir(baseDir) {
  return path.join(resolveMemoryWikiRoot(baseDir), ...AUDIT_SEGMENTS)
}

export async function createMemoryWikiAuditStore(baseDir) {
  const auditDir = resolveAuditDir(baseDir)
  await fs.mkdir(auditDir, { recursive: true })
  const filePath = path.join(auditDir, AUDIT_FILENAME)

  return {
    async append(event) {
      const payload = {
        eventId: normalizeString(event.eventId) || `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        eventType: normalizeString(event.eventType),
        pageId: normalizeString(event.pageId) || null,
        relatedPageId: normalizeString(event.relatedPageId) || null,
        versionId: normalizeString(event.versionId) || null,
        status: normalizeString(event.status) || null,
        importance: normalizeString(event.importance) || null,
        reason: truncate(event.reason),
        details: event.details ?? null,
        createdAt: event.createdAt ?? new Date().toISOString()
      }

      await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, 'utf8')
      return payload
    },

    async list({ limit = 50 } = {}) {
      try {
        const text = await fs.readFile(filePath, 'utf8')
        return text
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => JSON.parse(line))
          .slice(-Math.max(1, Math.min(500, Number(limit) || 50)))
          .reverse()
      } catch (error) {
        if (error?.code === 'ENOENT') return []
        throw error
      }
    },

    getFilePath() {
      return filePath
    }
  }
}
