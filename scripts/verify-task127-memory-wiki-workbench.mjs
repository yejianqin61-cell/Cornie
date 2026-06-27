import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import express from 'express'

import { openDb } from '../electron/db.js'
import { memoryWikiRoutes } from '../electron/backend/memory-wiki/routes.js'
import { createMemoryWikiService, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-127-'))
  const dbPath = path.join(tempRoot, 'verify-task127.sqlite')
  let store = null

  try {
    store = await openDb(dbPath)
    const memoryWiki = await createMemoryWikiService({ baseDir: tempRoot, store })
    const topicIndex = await createTopicIndexStore(tempRoot)

    const page = await memoryWiki.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '龙虾相关记忆',
      body: '# 龙虾'
    })

    await topicIndex.upsert({ keyword: '龙虾', pageIds: [page.pageId] })
    const governance = await memoryWiki.createGovernanceRequest({
      requestType: 'repair_suggestion',
      triggerSource: 'inspection',
      queueSection: 'repair_suggestions',
      title: '补充龙虾页面来源',
      reason: '这条记忆缺少明确来源，需要主人确认怎么补。',
      pageIds: [page.pageId],
      topicKeys: ['龙虾'],
      evidence: [{ pageId: page.pageId, issue: 'missing_source_ref' }]
    })

    const app = express()
    app.use(express.json())
    app.use('/api', memoryWikiRoutes({ memoryWiki, topicIndex }))
    const server = app.listen(0)
    const port = server.address().port

    try {
      const listRes = await fetch(`http://127.0.0.1:${port}/api/memory-wiki/governance?status=pending`)
      const listJson = await listRes.json()
      assert.equal(Array.isArray(listJson.items), true)
      assert.equal(listJson.items.some((item) => item.requestId === governance.requestId), true)

      const detailRes = await fetch(
        `http://127.0.0.1:${port}/api/memory-wiki/governance/${encodeURIComponent(governance.requestId)}`
      )
      const detailJson = await detailRes.json()
      assert.equal(detailJson.item.requestId, governance.requestId)

      const updateRes = await fetch(
        `http://127.0.0.1:${port}/api/memory-wiki/governance/${encodeURIComponent(governance.requestId)}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'deferred' })
        }
      )
      const updateJson = await updateRes.json()
      assert.equal(updateJson.item.status, 'deferred')

      const source = await memoryWiki.create({
        pageType: 'topic',
        title: '澳洲龙虾',
        summary: '来源页',
        body: '# 澳洲龙虾'
      })
      await memoryWiki.linkRelatedPages(page.pageId, [source.pageId])
      await memoryWiki.setStatus(page.pageId, 'inactive')
      const scanRes = await fetch(`http://127.0.0.1:${port}/api/memory-wiki/governance/inspection-scan`, {
        method: 'POST'
      })
      const scanJson = await scanRes.json()
      assert.equal(typeof scanJson.result.createdCount, 'number')
    } finally {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }

    const workspaceSource = await fs.readFile(
      path.resolve('src/renderer/components/MemoryWikiWorkspace.vue'),
      'utf8'
    )
    assert.match(workspaceSource, /治理待审核区/)
    assert.match(workspaceSource, /高风险确认中心/)
    assert.match(workspaceSource, /runInspectionScan/)
    assert.match(workspaceSource, /ConfirmCard/)

    console.log('verify-task127-memory-wiki-workbench: ok')
  } finally {
    try {
      store?.close?.()
    } catch {}
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
