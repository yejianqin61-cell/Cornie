import fs from 'node:fs'
import path from 'node:path'
import { createMemoryWikiService, buildPageSlug } from '../electron/backend/memory-wiki/index.js'
import { createPageCache } from '../electron/backend/memory-wiki/pageCache.js'

// 456：slug 数据修复（D-16）。
// 检测 pageId/slug 与 title 不一致的页面，按 title 重建 slug：
// - 保留 pageId（维持版本索引与 topic/related 引用不失效）；
// - 经 service.update 落新文件名并更新 page-index；
// - 删除旧文件，避免孤儿文件残留。
// 幂等：slug 已与 title 一致时零变更。

function normalizeString(value) {
  return String(value ?? '').trim()
}

export async function repairSlugMismatches({ baseDir = process.cwd(), store = null } = {}) {
  const memoryWiki = await createMemoryWikiService({ baseDir, store })
  const summaries = await memoryWiki.listSummaries()

  const fixed = []
  const skipped = []

  for (const summary of summaries) {
    const pageId = summary?.pageId
    if (!pageId) {
      skipped.push('missing_page_id')
      continue
    }

    const page = await memoryWiki.get(pageId)
    if (!page) continue

    const newSlug = buildPageSlug({ title: page.title })
    if (!newSlug || newSlug === 'untitled') {
      skipped.push(`${pageId}:empty_title`)
      continue
    }
    if (newSlug === normalizeString(page.slug)) {
      continue
    }

    const oldPath = normalizeString(page.filePath)
    const storage = memoryWiki.getStorage()
    const versionStore = memoryWiki.getVersionStore()
    if (typeof versionStore?.snapshotPage === 'function') {
      await versionStore.snapshotPage(page, { reason: 'slug_repair' })
    }
    const updated = await storage.updatePage({
      ...page,
      pageId: page.pageId,
      slug: newSlug,
      filePath: ''
    })
    // 绕过 service 直写后，失效共享页面缓存（命名空间与 service 一致）。
    createPageCache({ namespace: `${baseDir}::page` }).invalidate(page.pageId)

    if (oldPath && oldPath !== normalizeString(updated.filePath)) {
      await fs.promises.rm(oldPath, { force: true })
    }

    fixed.push({
      pageId: page.pageId,
      pageType: page.pageType,
      oldSlug: page.slug,
      newSlug,
      oldPath,
      newPath: updated.filePath
    })
  }

  return { fixed, skipped }
}

// CLI 入口：node scripts/repair-slug-mismatch.mjs
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  repairSlugMismatches()
    .then((result) => {
      console.log('repair-slug-mismatch:', JSON.stringify(result, null, 2))
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}
