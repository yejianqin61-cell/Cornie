import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { buildTopicCandidateKeys, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-topic-index-064-'))

  try {
    const store = await createTopicIndexStore(tempRoot)
    await store.upsert({
      keyword: '龙虾',
      aliases: ['lobster']
    })

    await store.updateAliases('龙虾', ['小龙虾', 'lobster'])
    const fetched = await store.get('龙虾')
    assert.deepEqual(fetched?.aliases, ['lobster', '小龙虾'])

    const candidates = buildTopicCandidateKeys({
      keyword: '龙虾',
      aliases: ['Lobster', '小龙虾']
    })
    assert.deepEqual(candidates, ['龙虾', 'lobster', '小龙虾'])

    const duplicateCandidates = await store.findDuplicateCandidates({
      keyword: 'Lobster',
      aliases: ['龙虾']
    })
    assert.equal(duplicateCandidates.length, 1)
    assert.equal(duplicateCandidates[0].keyword, '龙虾')

    console.log('verify-task064-topic-index-aliases: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
