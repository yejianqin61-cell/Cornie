import { createMemoryWikiStorage } from './storage.js'
import { createMemoryWikiVersionStore } from './versionStore.js'
import { createMemoryWikiAuditStore } from './audit.js'
import { createMemoryWikiInspector } from './inspector.js'
import { createTopicIndexStore } from './topicIndex.js'
import { createMemoryWikiGovernanceStore } from './governanceStore.js'
import { normalizePageStatus } from './pageModel.js'

function summarizePage(page) {
  return {
    pageId: page.pageId,
    pageType: page.pageType,
    title: page.title,
    slug: page.slug,
    summary: page.summary,
    status: page.status,
    importance: page.importance,
    ownerConfirmed: page.ownerConfirmed,
    filePath: page.filePath,
    updatedAt: page.lastUpdatedAt
  }
}

function buildGovernanceRequestFromBrokenLinkIssue(issue) {
  const pageIds = [issue.pageId, issue.relatedPageId].filter(Boolean)
  const topicKeys = [issue.normalizedKey].filter(Boolean)
  return {
    requestType: 'repair_suggestion',
    triggerSource: 'inspection',
    queueSection: 'repair_suggestions',
    riskLevel: 'high',
    pageIds,
    topicKeys,
    title: issue.issueType,
    reason: issue.suggestion?.reason || '巡检发现需要修复的问题',
    evidence: [issue],
    payload: issue.suggestion ?? {}
  }
}

function buildGovernanceRequestFromOrphanItem(item) {
  return {
    requestType: 'archive_candidate',
    triggerSource: 'inspection',
    queueSection: 'archive_candidates',
    riskLevel: 'high',
    pageIds: [item.pageId].filter(Boolean),
    topicKeys: [],
    title: item.title || item.pageId,
    reason: item.suggestion?.reason || '页面缺少来源与关联，可归档或补链',
    evidence: [item],
    payload: item.suggestion ?? {}
  }
}

export async function createMemoryWikiService({ baseDir, store } = {}) {
  if (!baseDir) {
    throw new Error('memory wiki service baseDir is required')
  }

  const storage = await createMemoryWikiStorage(baseDir)
  const versionStore = await createMemoryWikiVersionStore(baseDir)
  const auditStore = await createMemoryWikiAuditStore(baseDir)
  const topicIndex = await createTopicIndexStore(baseDir)
  const governanceStore = await createMemoryWikiGovernanceStore(baseDir)

  async function writeAudit(event) {
    return auditStore.append(event)
  }

  return {
    async create(input) {
      const page = await storage.createPage(input)
      await writeAudit({
        eventType: 'page_created',
        pageId: page.pageId,
        status: page.status,
        importance: page.importance,
        details: {
          pageType: page.pageType,
          title: page.title
        }
      })
      return page
    },

    async get(pageId) {
      if (!pageId) throw new Error('memory wiki pageId is required')
      return storage.readPageById(pageId)
    },

    async update(input) {
      if (!input?.pageId && !input?.page_id) {
        throw new Error('memory wiki pageId is required')
      }
      const pageId = input.pageId ?? input.page_id
      const existing = await storage.readPageById(pageId)
      if (!existing) {
        throw new Error(`memory wiki page not found: ${pageId}`)
      }

      await versionStore.snapshotPage(existing, { reason: 'before_update' })
      const updated = await storage.updatePage({
        ...existing,
        ...input,
        pageId: existing.pageId
      })
      await writeAudit({
        eventType: 'page_updated',
        pageId: existing.pageId,
        status: updated.status,
        importance: updated.importance,
        details: {
          title: updated.title
        }
      })
      return updated
    },

    async updateSummary(pageId, summary) {
      const existing = await this.get(pageId)
      if (!existing) throw new Error(`memory wiki page not found: ${pageId}`)
      return this.update({
        ...existing,
        pageId,
        summary
      })
    },

    async updateAliases(pageId, aliases) {
      const existing = await this.get(pageId)
      if (!existing) throw new Error(`memory wiki page not found: ${pageId}`)
      return this.update({
        ...existing,
        pageId,
        aliases: Array.isArray(aliases) ? aliases : []
      })
    },

    async setStatus(pageId, status) {
      const existing = await this.get(pageId)
      if (!existing) throw new Error(`memory wiki page not found: ${pageId}`)
      return this.update({
        ...existing,
        pageId,
        status: normalizePageStatus(status)
      })
    },

    async setImportance(pageId, importance) {
      const existing = await this.get(pageId)
      if (!existing) throw new Error(`memory wiki page not found: ${pageId}`)
      return this.update({
        ...existing,
        pageId,
        importance
      })
    },

    async setOwnerConfirmed(pageId, ownerConfirmed) {
      const existing = await this.get(pageId)
      if (!existing) throw new Error(`memory wiki page not found: ${pageId}`)
      return this.update({
        ...existing,
        pageId,
        ownerConfirmed: ownerConfirmed === true
      })
    },

    async addSourceRef(pageId, sourceRef) {
      const existing = await this.get(pageId)
      if (!existing) throw new Error(`memory wiki page not found: ${pageId}`)

      const serialized = JSON.stringify(sourceRef)
      const existingSerialized = new Set((existing.sourceRefs ?? []).map((item) => JSON.stringify(item)))
      if (existingSerialized.has(serialized)) {
        return existing
      }

      return this.update({
        ...existing,
        pageId,
        sourceRefs: [...(existing.sourceRefs ?? []), sourceRef]
      })
    },

    async archive(pageId) {
      return this.setStatus(pageId, 'archived')
    },

    async demote(pageId) {
      return this.setStatus(pageId, 'inactive')
    },

    async restore(pageId) {
      return this.setStatus(pageId, 'active')
    },

    async linkRelatedPages(pageId, relatedPageIds) {
      const existing = await this.get(pageId)
      if (!existing) throw new Error(`memory wiki page not found: ${pageId}`)

      const normalized = Array.from(
        new Set((Array.isArray(relatedPageIds) ? relatedPageIds : []).map((item) => String(item).trim()).filter(Boolean))
      ).filter((item) => item !== pageId)

      return this.update({
        ...existing,
        pageId,
        relatedPageIds: normalized
      })
    },

    async mergePages({ targetPageId, sourcePageId }) {
      if (!targetPageId || !sourcePageId) {
        throw new Error('memory wiki merge requires targetPageId and sourcePageId')
      }

      const target = await this.get(targetPageId)
      const source = await this.get(sourcePageId)
      if (!target || !source) {
        throw new Error('memory wiki merge pages not found')
      }

      const mergedAliases = Array.from(new Set([...(target.aliases ?? []), target.title, ...(source.aliases ?? []), source.title]))
        .map((item) => String(item).trim())
        .filter(Boolean)

      const mergedRelated = Array.from(
        new Set([...(target.relatedPageIds ?? []), ...(source.relatedPageIds ?? []), sourcePageId])
      ).filter((item) => item !== targetPageId)

      const mergedSourceRefs = Array.from(
        new Set([...(target.sourceRefs ?? []), ...(source.sourceRefs ?? [])].map((item) => JSON.stringify(item)))
      ).map((item) => JSON.parse(item))

      const mergedBody = [target.body, source.body].filter(Boolean).join('\n\n')

      const updatedTarget = await this.update({
        ...target,
        pageId: targetPageId,
        aliases: mergedAliases,
        relatedPageIds: mergedRelated,
        sourceRefs: mergedSourceRefs,
        body: mergedBody,
        summary: target.summary || source.summary
      })

      await this.archive(sourcePageId)
      await writeAudit({
        eventType: 'pages_merged',
        pageId: targetPageId,
        relatedPageId: sourcePageId,
        details: {
          targetTitle: updatedTarget.title,
          sourceTitle: source.title
        }
      })

      return {
        target: updatedTarget,
        archivedSourcePageId: sourcePageId
      }
    },

    async delete(pageId) {
      if (!pageId) throw new Error('memory wiki pageId is required')
      const existing = await storage.readPageById(pageId)
      if (!existing) return false
      await versionStore.snapshotPage(existing, { reason: 'before_delete' })
      const deleted = await storage.deletePage({ pageId, filePath: existing.filePath })
      if (deleted) {
        await writeAudit({
          eventType: 'page_deleted',
          pageId,
          status: existing.status,
          importance: existing.importance,
          details: {
            title: existing.title
          }
        })
      }
      return deleted
    },

    async compressPage({ pageId, summary, body, reason = 'manual_compression' }) {
      if (!pageId) throw new Error('memory wiki pageId is required')
      const existing = await this.get(pageId)
      if (!existing) {
        throw new Error(`memory wiki page not found: ${pageId}`)
      }

      await versionStore.snapshotPage(existing, { reason: 'before_compression' })

      const compressed = await storage.updatePage({
        ...existing,
        pageId,
        summary: summary ?? existing.summary,
        body: body ?? existing.body
      })

      await versionStore.snapshotPage(compressed, { reason: 'after_compression' })
      await writeAudit({
        eventType: 'page_compressed',
        pageId,
        status: compressed.status,
        importance: compressed.importance,
        reason,
        details: {
          title: compressed.title
        }
      })

      return compressed
    },

    async list({ pageType, status } = {}) {
      const items = await storage.listIndexedPages()
      return items.filter((item) => {
        if (pageType && item.pageType !== pageType) return false
        if (status && item.status !== status) return false
        return true
      })
    },

    async listSummaries(filters = {}) {
      const pages = await this.list(filters)
      return pages.map((item) => summarizePage(item))
    },

    async listVersions(pageId) {
      if (!pageId) throw new Error('memory wiki pageId is required')
      return versionStore.listPageVersions(pageId)
    },

    async getVersionDiff({ pageId, fromVersionId, toVersionId }) {
      if (!pageId) throw new Error('memory wiki pageId is required')
      if (!fromVersionId) throw new Error('memory wiki fromVersionId is required')
      if (!toVersionId) throw new Error('memory wiki toVersionId is required')
      return versionStore.diffVersions({ pageId, fromVersionId, toVersionId })
    },

    async rollback(pageId, versionId) {
      if (!pageId) throw new Error('memory wiki pageId is required')
      if (!versionId) throw new Error('memory wiki versionId is required')

      const existing = await this.get(pageId)
      if (!existing) {
        throw new Error(`memory wiki page not found: ${pageId}`)
      }

      const targetVersion = await versionStore.getVersion(versionId, pageId)
      if (!targetVersion?.pageSnapshot) {
        throw new Error(`memory wiki version not found: ${versionId}`)
      }

      await versionStore.snapshotPage(existing, {
        reason: 'before_rollback',
        sourceVersionId: versionId
      })

      const restored = await storage.updatePage({
        ...targetVersion.pageSnapshot,
        pageId,
        filePath: existing.filePath
      })

      await versionStore.snapshotPage(restored, {
        reason: 'after_rollback',
        sourceVersionId: versionId
      })
      await writeAudit({
        eventType: 'page_rolled_back',
        pageId,
        versionId,
        status: restored.status,
        importance: restored.importance,
        details: {
          title: restored.title
        }
      })

      return restored
    },

    async listAuditEvents(options = {}) {
      return auditStore.list(options)
    },

    async inspectBrokenLinks() {
      if (!store) {
        throw new Error('memory wiki inspectBrokenLinks requires store')
      }
      const liveInspector = await createMemoryWikiInspector({
        store,
        memoryWikiService: this,
        topicIndex
      })
      return liveInspector.inspectBrokenLinks()
    },

    async inspectOrphanPages() {
      if (!store) {
        throw new Error('memory wiki inspectOrphanPages requires store')
      }
      const liveInspector = await createMemoryWikiInspector({
        store,
        memoryWikiService: this,
        topicIndex
      })
      return liveInspector.inspectOrphanPages()
    },

    async enqueueInspectionGovernanceRequests() {
      const created = []

      const brokenLinks = await this.inspectBrokenLinks()
      for (const issue of brokenLinks.issues ?? []) {
        created.push(await governanceStore.create(buildGovernanceRequestFromBrokenLinkIssue(issue)))
      }

      const orphanPages = await this.inspectOrphanPages()
      for (const item of orphanPages.items ?? []) {
        created.push(await governanceStore.create(buildGovernanceRequestFromOrphanItem(item)))
      }

      return {
        createdCount: created.length,
        items: created
      }
    },

    async createGovernanceRequest(input) {
      return governanceStore.create(input)
    },

    async getGovernanceRequest(requestId) {
      if (!requestId) throw new Error('memory governance requestId is required')
      return governanceStore.get(requestId)
    },

    async listGovernanceRequests(filters = {}) {
      return governanceStore.list(filters)
    },

    async updateGovernanceRequestStatus(requestId, status) {
      if (!requestId) throw new Error('memory governance requestId is required')
      if (!status) throw new Error('memory governance status is required')
      return governanceStore.updateStatus(requestId, status)
    },

    getStorage() {
      return storage
    },

    getVersionStore() {
      return versionStore
    },

    getAuditStore() {
      return auditStore
    },

    getTopicIndex() {
      return topicIndex
    },

    getGovernanceStore() {
      return governanceStore
    }
  }
}
