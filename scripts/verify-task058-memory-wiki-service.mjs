import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-058-'))

  try {
    const service = await createMemoryWikiService({ baseDir: tempRoot })

    const created = await service.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '长期主题',
      body: '# 龙虾\n\n## 这是什么\n主题页'
    })
    assert.ok(created.pageId)

    const fetched = await service.get(created.pageId)
    assert.equal(fetched?.title, '龙虾')
    assert.equal(fetched?.summary, '长期主题')

    const updated = await service.update({
      pageId: created.pageId,
      summary: '跨日期反复提起的长期主题'
    })
    assert.equal(updated.summary, '跨日期反复提起的长期主题')

    const listed = await service.list()
    assert.equal(listed.length, 1)
    assert.equal(listed[0].pageId, created.pageId)

    const summaries = await service.listSummaries()
    assert.equal(summaries.length, 1)
    assert.equal(summaries[0].title, '龙虾')

    const deleted = await service.delete(created.pageId)
    assert.equal(deleted, true)
    assert.equal(await service.get(created.pageId), null)

    console.log('verify-task058-memory-wiki-service: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
