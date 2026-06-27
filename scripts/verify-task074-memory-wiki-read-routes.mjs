import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import express from 'express'
import { memoryWikiRoutes } from '../electron/backend/memory-wiki/routes.js'
import { createMemoryWikiService, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-074-'))

  try {
    const memoryWiki = await createMemoryWikiService({ baseDir: tempRoot })
    const topicIndex = await createTopicIndexStore(tempRoot)
    const page = await memoryWiki.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '长期主题',
      body: '# 龙虾'
    })
    await topicIndex.upsert({
      keyword: '龙虾',
      memoryPageIds: [page.pageId]
    })

    const app = express()
    app.use('/api', memoryWikiRoutes({ memoryWiki, topicIndex }))
    const server = app.listen(0)
    const port = server.address().port

    try {
      const pagesRes = await fetch(`http://127.0.0.1:${port}/api/memory-wiki/pages`)
      const pagesJson = await pagesRes.json()
      assert.equal(pagesJson.items.length, 1)

      const pageRes = await fetch(`http://127.0.0.1:${port}/api/memory-wiki/pages/${encodeURIComponent(page.pageId)}`)
      const pageJson = await pageRes.json()
      assert.equal(pageJson.page.title, '龙虾')

      const indexRes = await fetch(`http://127.0.0.1:${port}/api/memory-wiki/topic-index`)
      const indexJson = await indexRes.json()
      assert.equal(indexJson.items.length, 1)

      const itemRes = await fetch(`http://127.0.0.1:${port}/api/memory-wiki/topic-index/${encodeURIComponent('龙虾')}`)
      const itemJson = await itemRes.json()
      assert.equal(itemJson.item.keyword, '龙虾')
    } finally {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }

    console.log('verify-task074-memory-wiki-read-routes: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
