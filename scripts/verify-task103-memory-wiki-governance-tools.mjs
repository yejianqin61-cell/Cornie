import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb, saveMessage } from '../electron/db.js'
import { registerTool, getTool } from '../electron/backend/tools/registry.js'
import { registerMemoryWikiTools } from '../electron/backend/memory-wiki/tools.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-103-'))
  const dbPath = path.join(tempRoot, 'task103.sqlite')
  const store = await openDb(dbPath)

  try {
    saveMessage(store, {
      id: 'msg_lobster_1',
      date: '2026-06-27',
      role: 'user',
      content: '龙虾对我很重要'
    })

    await registerMemoryWikiTools({ baseDir: tempRoot, store }, { registerTool })

    const createPage = getTool('memory_wiki.create_page')
    const updatePage = getTool('memory_wiki.update_page')
    const getVersions = getTool('memory_wiki.get_versions')
    const getVersionDiff = getTool('memory_wiki.get_version_diff')
    const listAuditEvents = getTool('memory_wiki.list_audit_events')
    const inspectBrokenLinks = getTool('memory_wiki.inspect_broken_links')
    const inspectOrphanPages = getTool('memory_wiki.inspect_orphan_pages')
    const deletePage = getTool('memory_wiki.delete_page')
    const indexGet = getTool('memory_index.get')
    const indexList = getTool('memory_index.list')
    const indexMerge = getTool('memory_index.merge_topics')
    const indexUnlink = getTool('memory_index.unlink_page')
    const indexLink = getTool('memory_index.link_page')

    assert.ok(createPage && updatePage && getVersions && getVersionDiff && listAuditEvents)
    assert.ok(inspectBrokenLinks && inspectOrphanPages && deletePage)
    assert.ok(indexGet && indexList && indexMerge && indexUnlink && indexLink)

    const first = await createPage.handler({
      pageType: 'topic',
      title: '龙虾',
      summary: '第一版摘要',
      body: '# 龙虾\n喜欢'
    })
    const second = await createPage.handler({
      pageType: 'topic',
      title: '小龙虾',
      summary: '第二主题',
      body: '# 小龙虾'
    })

    await updatePage.handler({
      pageId: first.result.pageId,
      title: first.result.title,
      pageType: first.result.pageType,
      summary: '第二版摘要',
      body: '# 龙虾\n非常喜欢',
      status: first.result.status,
      importance: first.result.importance,
      ownerConfirmed: first.result.ownerConfirmed,
      aliases: first.result.aliases,
      sourceRefs: [{ kind: 'chat', date: '2026-06-27', messageId: 'msg_lobster_1' }],
      relatedPageIds: ['missing_page_001']
    })

    const versions = await getVersions.handler({ pageId: first.result.pageId })
    assert.ok(Array.isArray(versions.result) && versions.result.length >= 1)

    const beforeUpdateVersion = versions.result.find((item) => item.reason === 'before_update')
    assert.ok(beforeUpdateVersion)

    const diff = await getVersionDiff.handler({
      pageId: first.result.pageId,
      fromVersionId: beforeUpdateVersion.versionId,
      toVersionId: versions.result[0].versionId
    })
    assert.equal(typeof diff.result.bodyChanged, 'boolean')

    await indexLink.handler({ normalizedKey: '龙虾', pageId: first.result.pageId })
    await indexLink.handler({ normalizedKey: 'lobster', pageId: second.result.pageId })

    const indexEntry = await indexGet.handler({ normalizedKey: '龙虾' })
    assert.equal(indexEntry.result.normalizedKey, '龙虾')

    const mergeResult = await indexMerge.handler({
      targetNormalizedKey: '龙虾',
      sourceNormalizedKey: 'lobster'
    })
    assert.equal(mergeResult.result.removedSourceNormalizedKey, 'lobster')
    assert.ok(mergeResult.result.target.memoryPageIds.includes(first.result.pageId))
    assert.ok(mergeResult.result.target.memoryPageIds.includes(second.result.pageId))

    const unlinkResult = await indexUnlink.handler({
      normalizedKey: '龙虾',
      pageId: second.result.pageId
    })
    assert.ok(!unlinkResult.result.memoryPageIds.includes(second.result.pageId))

    const indexEntries = await indexList.handler({})
    assert.ok(indexEntries.result.length >= 1)

    const auditEvents = await listAuditEvents.handler({ limit: 20 })
    assert.ok(auditEvents.result.length >= 2)

    const brokenLinks = await inspectBrokenLinks.handler({})
    assert.ok(brokenLinks.result.issueCount >= 1)

    const orphanPages = await inspectOrphanPages.handler({})
    assert.ok(orphanPages.result.orphanCount >= 0)

    const deleted = await deletePage.handler({ pageId: second.result.pageId })
    assert.equal(deleted.result, true)

    console.log('verify-task103-memory-wiki-governance-tools: passed')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
