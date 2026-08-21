import fs from 'node:fs'
import path from 'node:path'

import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { migrateLegacyPersonPages } from './migrate-legacy-person-pages.mjs'

async function run() {
  const harness = await createServiceHarness('task455-legacy-person-migration')
  const memoryWiki = await createMemoryWikiService({
    baseDir: harness.baseDir,
    store: harness.store
  })

  try {
    // 1) 无同名 identity_person：旧 person 页 → 迁移重建
    const legacyOnly = await memoryWiki.create({
      pageType: 'person',
      title: '陈晨',
      personName: '陈晨',
      relationshipToUser: '朋友',
      sharedExperienceSummary: '大学室友',
      importance: 'medium',
      ownerConfirmed: false
    })

    // 2) 有同名 identity_person：旧页合并进新页
    const legacyDup = await memoryWiki.create({
      pageType: 'person',
      title: '钟奕菲',
      personName: '钟奕菲',
      relationshipToUser: '初恋',
      sourceRefs: [{ kind: 'chat', date: '2026-06-30', messageId: 'legacy-src' }]
    })
    const identityDup = await memoryWiki.create({
      pageType: 'identity_person',
      title: '钟奕菲',
      personName: '钟奕菲',
      relationshipToUser: '初恋',
      sourceRefs: [{ kind: 'chat', date: '2026-07-01', messageId: 'identity-src' }]
    })

    const result = await migrateLegacyPersonPages({ baseDir: harness.baseDir, store: harness.store })
    assert(result.migrated.includes(legacyOnly.pageId), '无同名旧页应被迁移重建', result)
    assert(result.merged.some((item) => item.legacyPageId === legacyDup.pageId), '同名旧页应被合并', result)

    // 3) 断言：pages/people/ 无残留、全仓库无 page_type: person
    const pagesRoot = path.join(harness.baseDir, 'data', 'memory-wiki', 'pages', 'people')
    const residualFiles = fs.existsSync(pagesRoot)
      ? fs.readdirSync(pagesRoot).filter((name) => name.endsWith('.md'))
      : []
    assert(residualFiles.length === 0, 'pages/people/ 应无残留', residualFiles)

    const personTypePages = await memoryWiki.listSummaries({ pageType: 'person' })
    assert(personTypePages.length === 0, '全仓库应无 page_type: person', personTypePages)

    // 4) 迁移后的 identity_person 页字段保留
    const identityPages = await memoryWiki.listSummaries({ pageType: 'identity_person' })
    assert(identityPages.length === 2, '应有 2 个 identity_person 页', identityPages.length)

    const migratedPage = await memoryWiki.get(
      identityPages.find((item) => item.title === '陈晨').pageId
    )
    assert(migratedPage.personName === '陈晨', '迁移页应保留 personName')
    assert(migratedPage.relationshipToUser === '朋友', '迁移页应保留关系')

    const mergedPage = await memoryWiki.get(
      identityPages.find((item) => item.title === '钟奕菲').pageId
    )
    const mergedSourceRefs = Array.isArray(mergedPage.sourceRefs) ? mergedPage.sourceRefs : []
    assert(
      mergedSourceRefs.some((item) => item.messageId === 'legacy-src') &&
        mergedSourceRefs.some((item) => item.messageId === 'identity-src'),
      '合并页应保留双方来源引用'
    )

    // 5) 幂等：再次运行零变更
    const rerun = await migrateLegacyPersonPages({ baseDir: harness.baseDir, store: harness.store })
    assert(rerun.migrated.length === 0 && rerun.merged.length === 0, '再次运行应零变更', rerun)

    console.log('verify-task455-legacy-person-migration: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
