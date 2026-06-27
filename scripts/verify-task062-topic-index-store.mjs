import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-topic-index-062-'))

  try {
    const store = await createTopicIndexStore(tempRoot)

    const entry = await store.upsert({
      keyword: '龙虾',
      aliases: ['lobster', '小龙虾'],
      dates: ['2026-06-27'],
      memoryPageIds: ['topic_lobster'],
      importance: 'high'
    })

    assert.equal(entry.keyword, '龙虾')
    assert.equal(entry.normalizedKey, '龙虾')
    assert.deepEqual(entry.aliases, ['lobster', '小龙虾'])
    assert.deepEqual(entry.dates, ['2026-06-27'])
    assert.deepEqual(entry.memoryPageIds, ['topic_lobster'])
    assert.equal(entry.importance, 'high')

    const fetched = await store.get('龙虾')
    assert.equal(fetched?.keyword, '龙虾')
    assert.deepEqual(fetched?.aliases, ['lobster', '小龙虾'])

    const listed = await store.list()
    assert.equal(listed.length, 1)
    assert.equal(listed[0].normalizedKey, '龙虾')

    const fileText = await fs.readFile(store.getFilePath(), 'utf8')
    const parsed = JSON.parse(fileText)
    assert.ok(parsed['龙虾'])

    console.log('verify-task062-topic-index-store: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
