import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb } from '../electron/db.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-m11-095-'))
  const dbPath = path.join(tempRoot, 'task095.sqlite')
  const store = await openDb(dbPath)

  try {
    const service = await createMemoryWikiService({ baseDir: tempRoot, store })
    const topicIndex = service.getTopicIndex()

    const page = await service.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '主题',
      body: '# 龙虾',
      relatedPageIds: ['missing_page']
    })

    await service.update({
      ...page,
      pageId: page.pageId,
      sourceRefs: [
        {
          kind: 'chat',
          date: '2026-06-27',
          messageId: 'missing_message'
        },
        {
          kind: 'observation',
          observationId: 'missing_observation'
        }
      ]
    })

    await topicIndex.upsert({
      keyword: '龙虾',
      memoryPageIds: ['missing_page'],
      chatRefs: ['2026-06-27#missing_message'],
      observationRefs: ['2026-06-27#missing_observation']
    })

    const report = await service.inspectBrokenLinks()
    assert.ok(report.issueCount >= 5)
    assert.ok(report.issues.some((item) => item.issueType === 'missing_topic_page_link'))
    assert.ok(report.issues.some((item) => item.issueType === 'missing_page_chat_source'))
    assert.ok(report.issues.some((item) => item.issueType === 'missing_page_observation_source'))

    console.log('verify-task095-memory-wiki-broken-links: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
