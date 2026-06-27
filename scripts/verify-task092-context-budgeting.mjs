import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb } from '../electron/db.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { buildWikiContext } from '../electron/backend/agent/wikiContext.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-context-092-'))
  const dbPath = path.join(tempRoot, 'task092.sqlite')
  const store = await openDb(dbPath)

  try {
    const memoryWiki = await createMemoryWikiService({ baseDir: tempRoot })

    for (let index = 0; index < 6; index += 1) {
      await memoryWiki.create({
        pageType: 'topic',
        title: `主题${index}`,
        summary: `摘要${index}`,
        importance: index === 0 ? 'critical' : index < 3 ? 'high' : 'low',
        status: 'active',
        ownerConfirmed: index < 2,
        body: `# 主题${index}`
      })
    }

    const context = await buildWikiContext(store, {
      date: '2026-06-27',
      baseDir: tempRoot,
      pageLimit: 4
    })

    assert.equal(context.selectedPages.length, 4)
    assert.equal(context.selectedPages[0].title, '主题0')
    assert.doesNotMatch(context.memorySummary, /主题5/)

    console.log('verify-task092-context-budgeting: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
