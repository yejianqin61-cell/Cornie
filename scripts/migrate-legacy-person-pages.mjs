import fs from 'node:fs'
import path from 'node:path'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

// 455：旧 person 页面迁移（page_type: person → identity_person）。
// 规则：
// 1. 扫描 pages/people/*.md（page_type: person）。
// 2. 存在同名 identity_person 页 → 合并（sourceRefs / relatedPageIds 去重）后删除旧页。
// 3. 否则 → 以 identity_person 重建（字段映射保留），删除旧页。
// 幂等：迁移后 pages/people/ 无残留，可重复运行。

function normalizeString(value) {
  return String(value ?? '').trim()
}

function mergeUniqueById(left = [], right = []) {
  const seen = new Set()
  const merged = []
  for (const item of [...left, ...right]) {
    const key = typeof item === 'string' ? item : normalizeString(item?.id ?? item?.observationId ?? item?.messageId ?? JSON.stringify(item))
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }
  return merged
}

function samePerson(identityPage, legacyPage) {
  const identityNames = [
    identityPage?.personName,
    identityPage?.title,
    ...(Array.isArray(identityPage?.aliases) ? identityPage.aliases : [])
  ].map((item) => normalizeString(item).toLowerCase()).filter(Boolean)

  const legacyNames = [
    legacyPage?.personName,
    legacyPage?.title,
    ...(Array.isArray(legacyPage?.aliases) ? legacyPage.aliases : [])
  ].map((item) => normalizeString(item).toLowerCase()).filter(Boolean)

  return identityNames.some((name) => legacyNames.includes(name))
}

export async function migrateLegacyPersonPages({ baseDir = process.cwd(), store = null } = {}) {
  const memoryWiki = await createMemoryWikiService({ baseDir, store })

  const legacySummaries = await memoryWiki.listSummaries({ pageType: 'person' })
  const identitySummaries = await memoryWiki.listSummaries({ pageType: 'identity_person' })

  const migrated = []
  const merged = []
  const skipped = []

  for (const summary of legacySummaries) {
    const legacyPage = summary?.pageId ? await memoryWiki.get(summary.pageId) : null
    if (!legacyPage?.pageId) {
      skipped.push(summary?.pageId ?? 'unknown')
      continue
    }

    const identityPages = await Promise.all(
      identitySummaries.map((item) => (item?.pageId ? memoryWiki.get(item.pageId) : null))
    )
    const matchingIdentity = identityPages.find((page) => page && samePerson(page, legacyPage))

    if (matchingIdentity) {
      const sourceRefs = mergeUniqueById(
        Array.isArray(matchingIdentity.sourceRefs) ? matchingIdentity.sourceRefs : [],
        Array.isArray(legacyPage.sourceRefs) ? legacyPage.sourceRefs : []
      )
      const relatedPageIds = mergeUniqueById(
        Array.isArray(matchingIdentity.relatedPageIds) ? matchingIdentity.relatedPageIds : [],
        Array.isArray(legacyPage.relatedPageIds) ? legacyPage.relatedPageIds : []
      )
      const updateInput = { pageId: matchingIdentity.pageId }
      if (sourceRefs.length > 0) updateInput.sourceRefs = sourceRefs
      if (relatedPageIds.length > 0) updateInput.relatedPageIds = relatedPageIds
      if (!normalizeString(matchingIdentity.summary) && normalizeString(legacyPage.summary)) {
        updateInput.summary = legacyPage.summary
      }
      await memoryWiki.update(updateInput)
      await memoryWiki.delete(legacyPage.pageId)
      merged.push({ legacyPageId: legacyPage.pageId, identityPageId: matchingIdentity.pageId })
      continue
    }

    await memoryWiki.create({
      pageType: 'identity_person',
      title: legacyPage.title,
      personName: legacyPage.personName || legacyPage.title,
      relationshipToUser: legacyPage.relationshipToUser,
      roleSummary: legacyPage.roleSummary,
      personalitySummary: legacyPage.personalitySummary,
      meaningToUser: legacyPage.meaningToUser,
      sharedExperienceSummary: legacyPage.sharedExperienceSummary,
      emotionalWeight: legacyPage.emotionalWeight,
      timelineSummary: legacyPage.timelineSummary,
      firstKnownPeriod: legacyPage.firstKnownPeriod,
      aliases: Array.isArray(legacyPage.aliases) ? legacyPage.aliases : [],
      importance: legacyPage.importance || 'medium',
      ownerConfirmed: legacyPage.ownerConfirmed === true,
      sourceRefs: Array.isArray(legacyPage.sourceRefs) ? legacyPage.sourceRefs : [],
      summary: legacyPage.summary,
      body: legacyPage.body
    })
    await memoryWiki.delete(legacyPage.pageId)
    migrated.push(legacyPage.pageId)
  }

  return { migrated, merged, skipped }
}

// CLI 入口：node scripts/migrate-legacy-person-pages.mjs
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  migrateLegacyPersonPages()
    .then((result) => {
      console.log('migrate-legacy-person-pages:', JSON.stringify(result, null, 2))
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}
