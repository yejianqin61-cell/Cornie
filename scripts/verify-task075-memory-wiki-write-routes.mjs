import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import express from 'express'
import { memoryWikiRoutes } from '../electron/backend/memory-wiki/routes.js'
import { createMemoryWikiService, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-075-'))

  try {
    const memoryWiki = await createMemoryWikiService({ baseDir: tempRoot })
    const topicIndex = await createTopicIndexStore(tempRoot)
    const app = express()
    app.use(express.json())
    app.use('/api', memoryWikiRoutes({ memoryWiki, topicIndex }))
    const server = app.listen(0)
    const port = server.address().port

    try {
      const createdRes = await fetch(`http://127.0.0.1:${port}/api/memory-wiki/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType: 'topic',
          title: '龙虾',
          summary: '第一版',
          body: '# 龙虾'
        })
      })
      const createdJson = await createdRes.json()
      const pageId = createdJson.page.pageId
      assert.ok(pageId)

      const summaryRes = await fetch(`http://127.0.0.1:${port}/api/memory-wiki/pages/${encodeURIComponent(pageId)}/summary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: '第二版摘要' })
      })
      const summaryJson = await summaryRes.json()
      assert.equal(summaryJson.page.summary, '第二版摘要')

      const statusRes = await fetch(`http://127.0.0.1:${port}/api/memory-wiki/pages/${encodeURIComponent(pageId)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' })
      })
      const statusJson = await statusRes.json()
      assert.equal(statusJson.page.status, 'archived')

      const importanceRes = await fetch(`http://127.0.0.1:${port}/api/memory-wiki/pages/${encodeURIComponent(pageId)}/importance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importance: 'high' })
      })
      const importanceJson = await importanceRes.json()
      assert.equal(importanceJson.page.importance, 'high')
    } finally {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }

    console.log('verify-task075-memory-wiki-write-routes: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
