import { Router } from 'express'
import { asyncHandler } from '../http/middleware.js'
import { requireString } from '../validators.js'

export function memoryWikiRoutes({ memoryWiki, topicIndex }) {
  const r = Router()

  r.get(
    '/memory-wiki/pages',
    asyncHandler(async (req, res) => {
      const pageType = req.query.pageType ? requireString(req.query.pageType, 'pageType', { maxLen: 64 }) : undefined
      const status = req.query.status ? requireString(req.query.status, 'status', { maxLen: 64 }) : undefined
      const limit = req.query.limit
      const offset = req.query.offset

      // 463：分页透传；hydrate=false 时返回轻索引摘要（按需拉全量详情）。
      const options = req.query.hydrate === 'false' ? { hydrate: false } : {}
      const filters = { pageType, status }
      if (limit !== undefined) filters.limit = limit
      if (offset !== undefined) filters.offset = offset

      const items = await memoryWiki.listSummaries(filters, options)
      res.json({ items, total: items.length, limit: filters.limit ?? null, offset: filters.offset ?? null })
    })
  )

  r.get(
    '/memory-wiki/pages/:pageId',
    asyncHandler(async (req, res) => {
      const pageId = requireString(req.params.pageId, 'pageId', { maxLen: 256 })
      const page = await memoryWiki.get(pageId)
      res.json({ page })
    })
  )

  r.get(
    '/memory-wiki/pages/:pageId/source-trace',
    asyncHandler(async (req, res) => {
      const pageId = requireString(req.params.pageId, 'pageId', { maxLen: 256 })
      res.json({ trace: await memoryWiki.getPageSourceTrace(pageId) })
    })
  )

  r.get(
    '/memory-wiki/pages/:pageId/versions',
    asyncHandler(async (req, res) => {
      const pageId = requireString(req.params.pageId, 'pageId', { maxLen: 256 })
      res.json({ items: await memoryWiki.listVersions(pageId) })
    })
  )

  r.get(
    '/memory-wiki/pages/:pageId/version-diff',
    asyncHandler(async (req, res) => {
      const pageId = requireString(req.params.pageId, 'pageId', { maxLen: 256 })
      const fromVersionId = requireString(req.query.fromVersionId ?? '', 'fromVersionId', { maxLen: 256 })
      const toVersionId = requireString(req.query.toVersionId ?? '', 'toVersionId', { maxLen: 256 })
      res.json({
        diff: await memoryWiki.getVersionDiff({
          pageId,
          fromVersionId,
          toVersionId
        })
      })
    })
  )

  r.get(
    '/memory-wiki/topic-index',
    asyncHandler(async (_req, res) => {
      res.json({ items: await topicIndex.list() })
    })
  )

  r.get(
    '/memory-wiki/topic-index/:normalizedKey',
    asyncHandler(async (req, res) => {
      const normalizedKey = requireString(req.params.normalizedKey, 'normalizedKey', { maxLen: 256 })
      const item = await topicIndex.get(normalizedKey)
      res.json({ item })
    })
  )

  r.get(
    '/memory-wiki/topic-index/:normalizedKey/source-trace',
    asyncHandler(async (req, res) => {
      const normalizedKey = requireString(req.params.normalizedKey, 'normalizedKey', { maxLen: 256 })
      res.json({ trace: await memoryWiki.getTopicSourceTrace(normalizedKey) })
    })
  )

  r.get(
    '/memory-wiki/governance',
    asyncHandler(async (req, res) => {
      const status = req.query.status ? requireString(req.query.status, 'status', { maxLen: 64 }) : undefined
      const requestType = req.query.requestType
        ? requireString(req.query.requestType, 'requestType', { maxLen: 64 })
        : undefined
      const triggerSource = req.query.triggerSource
        ? requireString(req.query.triggerSource, 'triggerSource', { maxLen: 64 })
        : undefined
      const queueSection = req.query.queueSection
        ? requireString(req.query.queueSection, 'queueSection', { maxLen: 64 })
        : undefined

      res.json({
        items: await memoryWiki.listGovernanceRequests({
          status,
          requestType,
          triggerSource,
          queueSection
        })
      })
    })
  )

  r.get(
    '/memory-wiki/governance/:requestId',
    asyncHandler(async (req, res) => {
      const requestId = requireString(req.params.requestId, 'requestId', { maxLen: 256 })
      const item = await memoryWiki.getGovernanceRequest(requestId)
      res.json({ item })
    })
  )

  r.post(
    '/memory-wiki/pages',
    asyncHandler(async (req, res) => {
      const pageType = requireString(req.body?.pageType ?? req.body?.page_type, 'pageType', { maxLen: 64 })
      const title = requireString(req.body?.title ?? '', 'title', { maxLen: 256 })
      const summary = req.body?.summary === undefined ? '' : requireString(req.body.summary, 'summary', { maxLen: 2000 })
      const body = req.body?.body === undefined ? '' : requireString(req.body.body, 'body', { maxLen: 100_000 })
      const page = await memoryWiki.create({
        ...req.body,
        pageType,
        title,
        summary,
        body
      })
      res.json({ page })
    })
  )

  r.put(
    '/memory-wiki/pages/:pageId',
    asyncHandler(async (req, res) => {
      const pageId = requireString(req.params.pageId, 'pageId', { maxLen: 256 })
      const page = await memoryWiki.update({
        ...req.body,
        pageId
      })
      res.json({ page })
    })
  )

  r.put(
    '/memory-wiki/pages/:pageId/summary',
    asyncHandler(async (req, res) => {
      const pageId = requireString(req.params.pageId, 'pageId', { maxLen: 256 })
      const summary = requireString(req.body?.summary ?? '', 'summary', { maxLen: 2000 })
      res.json({ page: await memoryWiki.updateSummary(pageId, summary) })
    })
  )

  r.put(
    '/memory-wiki/pages/:pageId/aliases',
    asyncHandler(async (req, res) => {
      const pageId = requireString(req.params.pageId, 'pageId', { maxLen: 256 })
      res.json({ page: await memoryWiki.updateAliases(pageId, Array.isArray(req.body?.aliases) ? req.body.aliases : []) })
    })
  )

  r.put(
    '/memory-wiki/pages/:pageId/status',
    asyncHandler(async (req, res) => {
      const pageId = requireString(req.params.pageId, 'pageId', { maxLen: 256 })
      const status = requireString(req.body?.status ?? '', 'status', { maxLen: 64 })
      res.json({ page: await memoryWiki.setStatus(pageId, status) })
    })
  )

  r.put(
    '/memory-wiki/pages/:pageId/importance',
    asyncHandler(async (req, res) => {
      const pageId = requireString(req.params.pageId, 'pageId', { maxLen: 256 })
      const importance = requireString(req.body?.importance ?? '', 'importance', { maxLen: 64 })
      res.json({ page: await memoryWiki.setImportance(pageId, importance) })
    })
  )

  r.post(
    '/memory-wiki/pages/:pageId/archive',
    asyncHandler(async (req, res) => {
      const pageId = requireString(req.params.pageId, 'pageId', { maxLen: 256 })
      res.json({ page: await memoryWiki.archive(pageId) })
    })
  )

  r.post(
    '/memory-wiki/pages/:pageId/restore',
    asyncHandler(async (req, res) => {
      const pageId = requireString(req.params.pageId, 'pageId', { maxLen: 256 })
      res.json({ page: await memoryWiki.restore(pageId) })
    })
  )

  r.post(
    '/memory-wiki/pages/:pageId/rollback',
    asyncHandler(async (req, res) => {
      const pageId = requireString(req.params.pageId, 'pageId', { maxLen: 256 })
      const versionId = requireString(req.body?.versionId ?? '', 'versionId', { maxLen: 256 })
      res.json({ page: await memoryWiki.rollback(pageId, versionId) })
    })
  )

  r.post(
    '/memory-wiki/pages/merge',
    asyncHandler(async (req, res) => {
      const targetPageId = requireString(req.body?.targetPageId ?? '', 'targetPageId', { maxLen: 256 })
      const sourcePageId = requireString(req.body?.sourcePageId ?? '', 'sourcePageId', { maxLen: 256 })
      res.json({ result: await memoryWiki.mergePages({ targetPageId, sourcePageId }) })
    })
  )

  r.put(
    '/memory-wiki/pages/:pageId/related-pages',
    asyncHandler(async (req, res) => {
      const pageId = requireString(req.params.pageId, 'pageId', { maxLen: 256 })
      const relatedPageIds = Array.isArray(req.body?.relatedPageIds) ? req.body.relatedPageIds : []
      res.json({ page: await memoryWiki.linkRelatedPages(pageId, relatedPageIds) })
    })
  )

  r.put(
    '/memory-wiki/topic-index/:normalizedKey/aliases',
    asyncHandler(async (req, res) => {
      const normalizedKey = requireString(req.params.normalizedKey, 'normalizedKey', { maxLen: 256 })
      const aliases = Array.isArray(req.body?.aliases) ? req.body.aliases : []
      res.json({ item: await topicIndex.updateAliases(normalizedKey, aliases) })
    })
  )

  r.post(
    '/memory-wiki/topic-index/:normalizedKey/link-page',
    asyncHandler(async (req, res) => {
      const normalizedKey = requireString(req.params.normalizedKey, 'normalizedKey', { maxLen: 256 })
      const pageId = requireString(req.body?.pageId ?? '', 'pageId', { maxLen: 256 })
      res.json({ item: await topicIndex.linkPage(normalizedKey, pageId) })
    })
  )

  r.post(
    '/memory-wiki/pages/:pageId/link-topic',
    asyncHandler(async (req, res) => {
      const pageId = requireString(req.params.pageId, 'pageId', { maxLen: 256 })
      const keyword = requireString(req.body?.keyword ?? '', 'keyword', { maxLen: 256 })
      const note = req.body?.note === undefined ? undefined : requireString(req.body.note, 'note', { maxLen: 2000 })
      const importance = req.body?.importance === undefined
        ? undefined
        : requireString(req.body.importance, 'importance', { maxLen: 64 })
      const aliases = Array.isArray(req.body?.aliases) ? req.body.aliases : []
      const relatedPageIds = Array.isArray(req.body?.relatedPageIds) ? req.body.relatedPageIds : []

      res.json({
        result: await memoryWiki.linkPageToTopic({
          pageId,
          keyword,
          note,
          importance,
          aliases,
          relatedPageIds
        })
      })
    })
  )

  r.put(
    '/memory-wiki/governance/:requestId/status',
    asyncHandler(async (req, res) => {
      const requestId = requireString(req.params.requestId, 'requestId', { maxLen: 256 })
      const status = requireString(req.body?.status ?? '', 'status', { maxLen: 64 })
      res.json({ item: await memoryWiki.updateGovernanceRequestStatus(requestId, status) })
    })
  )

  r.post(
    '/memory-wiki/governance/:requestId/apply',
    asyncHandler(async (req, res) => {
      const requestId = requireString(req.params.requestId, 'requestId', { maxLen: 256 })
      res.json({ result: await memoryWiki.applyGovernanceUpgradeRequest(requestId) })
    })
  )

  r.post(
    '/memory-wiki/governance/inspection-scan',
    asyncHandler(async (_req, res) => {
      res.json({ result: await memoryWiki.enqueueInspectionGovernanceRequests() })
    })
  )

  return r
}
