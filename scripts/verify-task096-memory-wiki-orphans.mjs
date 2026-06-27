import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb } from '../electron/db.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-m11-096-'))
  const dbPath = path.join(tempRoot, 'task096.sqlite')
  const store = await openDb(dbPath)

  try {
    const service = await createMemoryWikiService({ baseDir: tempRoot, store })
    const topicIndex = service.getTopicIndex()

    const orphan = await service.create({
      pageType: 'topic',
      title: '孤儿主题',
      summary: '暂无任何关联',
      body: '# 孤儿主题'
    })

    const linked = await service.create({
      pageType: 'topic',
      title: '已关联主题',
      summary: '已有索引',
      body: '# 已关联主题'
    })

    await topicIndex.upsert({
      keyword: '已关联主题',
      memoryPageIds: [linked.pageId]
    })

    const report = await service.inspectOrphanPages()
    assert.equal(report.orphanCount, 1)
    assert.equal(report.items[0].pageId, orphan.pageId)
    assert.match(report.items[0].suggestion.reason, /补链、合并或归档/)

    console.log('verify-task096-memory-wiki-orphans: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
