import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import express from 'express'
import { memoryWikiRoutes } from '../electron/backend/memory-wiki/routes.js'
import { createMemoryWikiService, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-076-'))

  try {
    const memoryWiki = await createMemoryWikiService({ baseDir: tempRoot })
    const topicIndex = await createTopicIndexStore(tempRoot)
    const target = await memoryWiki.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '目标页',
      body: '# 龙虾'
    })
    const source = await memoryWiki.create({
      pageType: 'topic',
      title: '小龙虾',
      summary: '源页',
      body: '# 小龙虾'
    })
    await topicIndex.upsert({ keyword: '龙虾' })

    const app = express()
    app.use(express.json())
    app.use('/api', memoryWikiRoutes({ memoryWiki, topicIndex }))
    const server = app.listen(0)
    const port = server.address().port

    try {
      const relatedRes = await fetch(`http://127.0.0.1:${port}/api/memory-wiki/pages/${encodeURIComponent(target.pageId)}/related-pages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relatedPageIds: [source.pageId] })
      })
      const relatedJson = await relatedRes.json()
      assert.deepEqual(relatedJson.page.relatedPageIds, [source.pageId])

      const mergeRes = await fetch(`http://127.0.0.1:${port}/api/memory-wiki/pages/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPageId: target.pageId, sourcePageId: source.pageId })
      })
      const mergeJson = await mergeRes.json()
      assert.equal(mergeJson.result.archivedSourcePageId, source.pageId)

      const aliasRes = await fetch(`http://127.0.0.1:${port}/api/memory-wiki/topic-index/${encodeURIComponent('龙虾')}/aliases`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aliases: ['lobster'] })
      })
      const aliasJson = await aliasRes.json()
      assert.deepEqual(aliasJson.item.aliases, ['lobster'])

      const linkRes = await fetch(`http://127.0.0.1:${port}/api/memory-wiki/topic-index/${encodeURIComponent('龙虾')}/link-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: target.pageId })
      })
      const linkJson = await linkRes.json()
      assert.deepEqual(linkJson.item.memoryPageIds, [target.pageId])
    } finally {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }

    console.log('verify-task076-memory-wiki-governance-routes: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
