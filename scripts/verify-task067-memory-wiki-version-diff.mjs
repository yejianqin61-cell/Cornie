import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createMemoryWikiService, createMemoryWikiVersionStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-067-'))

  try {
    const service = await createMemoryWikiService({ baseDir: tempRoot })
    const versionStore = await createMemoryWikiVersionStore(tempRoot)

    const created = await service.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '第一版摘要',
      body: '# 龙虾\n\n第一版正文'
    })

    const firstSnapshot = await versionStore.snapshotPage(created, { reason: 'v1' })

    const updated = await service.update({
      ...created,
      summary: '第二版摘要',
      body: '# 龙虾\n\n第二版正文'
    })

    const secondSnapshot = await versionStore.snapshotPage(updated, { reason: 'v2' })

    const fetchedFirst = await versionStore.getVersion(firstSnapshot.versionId, created.pageId)
    assert.equal(fetchedFirst?.pageSnapshot.summary, '第一版摘要')

    const diff = await versionStore.diffVersions({
      pageId: created.pageId,
      fromVersionId: firstSnapshot.versionId,
      toVersionId: secondSnapshot.versionId
    })

    assert.equal(diff.summaryChanged, true)
    assert.equal(diff.bodyChanged, true)
    assert.equal(diff.fromSummary, '第一版摘要')
    assert.equal(diff.toSummary, '第二版摘要')

    console.log('verify-task067-memory-wiki-version-diff: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
