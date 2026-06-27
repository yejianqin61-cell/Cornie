import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-060-'))

  try {
    const service = await createMemoryWikiService({ baseDir: tempRoot })

    const first = await service.create({
      pageType: 'topic',
      title: '龙虾',
      status: 'active',
      body: '# 龙虾'
    })
    const second = await service.create({
      pageType: 'project',
      title: 'Cornie',
      status: 'active',
      body: '# Cornie'
    })

    await service.archive(first.pageId)
    const archived = await service.get(first.pageId)
    assert.equal(archived?.status, 'archived')

    const archivedList = await service.list({ status: 'archived' })
    assert.equal(archivedList.length, 1)
    assert.equal(archivedList[0].pageId, first.pageId)

    await service.restore(first.pageId)
    const restored = await service.get(first.pageId)
    assert.equal(restored?.status, 'active')

    await service.linkRelatedPages(first.pageId, [second.pageId])
    const linked = await service.get(first.pageId)
    assert.deepEqual(linked?.relatedPageIds, [second.pageId])

    console.log('verify-task060-memory-wiki-lifecycle: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
