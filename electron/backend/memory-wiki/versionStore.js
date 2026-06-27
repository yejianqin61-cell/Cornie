import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { resolveMemoryWikiRoot } from './constants.js'

const VERSIONS_SEGMENTS = ['versions']
const VERSION_INDEX_FILENAME = 'version-index.json'

function normalizeString(value) {
  return String(value ?? '').trim()
}

function resolveVersionsRoot(baseDir) {
  return path.resolve(resolveMemoryWikiRoot(baseDir), ...VERSIONS_SEGMENTS)
}

async function ensureJsonFile(filePath, fallbackValue) {
  try {
    await fs.access(filePath)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    await fs.writeFile(filePath, JSON.stringify(fallbackValue, null, 2), 'utf8')
  }
}

function createVersionRecord({ page, reason, sourceVersionId } = {}) {
  const versionId = `ver_${randomUUID().slice(0, 12)}`
  const createdAt = new Date().toISOString()

  return {
    versionId,
    pageId: page.pageId,
    pageType: page.pageType,
    title: page.title,
    slug: page.slug,
    status: page.status,
    importance: page.importance,
    ownerConfirmed: page.ownerConfirmed === true,
    reason: normalizeString(reason) || 'snapshot',
    sourceVersionId: normalizeString(sourceVersionId),
    createdAt,
    pageSnapshot: page
  }
}

export async function createMemoryWikiVersionStore(baseDir) {
  const versionsRoot = resolveVersionsRoot(baseDir)
  await fs.mkdir(versionsRoot, { recursive: true })
  const versionIndexPath = path.join(versionsRoot, VERSION_INDEX_FILENAME)
  await ensureJsonFile(versionIndexPath, {})

  async function readVersionIndex() {
    const text = await fs.readFile(versionIndexPath, 'utf8')
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : {}
  }

  async function writeVersionIndex(indexMap) {
    await fs.writeFile(versionIndexPath, JSON.stringify(indexMap, null, 2), 'utf8')
  }

  return {
    async snapshotPage(page, options = {}) {
      const record = createVersionRecord({ page, reason: options.reason, sourceVersionId: options.sourceVersionId })
      const pageVersionDir = path.join(versionsRoot, page.pageId)
      await fs.mkdir(pageVersionDir, { recursive: true })
      const snapshotPath = path.join(pageVersionDir, `${record.versionId}.json`)
      await fs.writeFile(snapshotPath, JSON.stringify(record, null, 2), 'utf8')

      const indexMap = await readVersionIndex()
      if (!Array.isArray(indexMap[page.pageId])) {
        indexMap[page.pageId] = []
      }
      indexMap[page.pageId].push({
        versionId: record.versionId,
        pageId: record.pageId,
        title: record.title,
        reason: record.reason,
        createdAt: record.createdAt,
        snapshotPath
      })
      await writeVersionIndex(indexMap)
      return { ...record, snapshotPath }
    },

    async listPageVersions(pageId) {
      const indexMap = await readVersionIndex()
      return Array.isArray(indexMap[pageId]) ? [...indexMap[pageId]] : []
    },

    async getVersion(versionId, pageId) {
      const pageVersions = await this.listPageVersions(pageId)
      const target = pageVersions.find((item) => item.versionId === versionId)
      if (!target?.snapshotPath) return null
      const text = await fs.readFile(target.snapshotPath, 'utf8')
      return JSON.parse(text)
    },

    async diffVersions({ pageId, fromVersionId, toVersionId }) {
      const fromVersion = await this.getVersion(fromVersionId, pageId)
      const toVersion = await this.getVersion(toVersionId, pageId)
      if (!fromVersion || !toVersion) {
        throw new Error('memory wiki diff versions are missing')
      }

      const fromPage = fromVersion.pageSnapshot
      const toPage = toVersion.pageSnapshot

      return {
        pageId,
        fromVersionId,
        toVersionId,
        titleChanged: fromPage.title !== toPage.title,
        summaryChanged: fromPage.summary !== toPage.summary,
        bodyChanged: fromPage.body !== toPage.body,
        statusChanged: fromPage.status !== toPage.status,
        importanceChanged: fromPage.importance !== toPage.importance,
        fromSummary: fromPage.summary,
        toSummary: toPage.summary,
        fromBody: fromPage.body,
        toBody: toPage.body
      }
    },

    getVersionsRoot() {
      return versionsRoot
    }
  }
}
