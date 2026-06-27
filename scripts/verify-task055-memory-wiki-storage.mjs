import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createMemoryWikiStorage } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-055-'))

  try {
    const storage = await createMemoryWikiStorage(tempRoot)

    const created = await storage.createPage({
      pageType: 'topic',
      title: '龙虾',
      aliases: ['lobster'],
      summary: '主人会反复提到龙虾',
      body: '# 龙虾\n\n## 这是什么\n高价值主题'
    })

    assert.ok(created.filePath.endsWith(path.join('topics', '龙虾.md')))

    const text = await fs.readFile(created.filePath, 'utf8')
    assert.ok(text.startsWith('---\npage_id: '))
    assert.ok(text.includes('page_type: topic'))
    assert.ok(text.includes('title: 龙虾'))
    assert.ok(text.includes('  - lobster'))

    const readBack = await storage.readPageByPath(created.filePath)
    assert.equal(readBack.pageType, 'topic')
    assert.equal(readBack.title, '龙虾')
    assert.deepEqual(readBack.aliases, ['lobster'])
    assert.equal(readBack.summary, '主人会反复提到龙虾')
    assert.equal(readBack.body, '# 龙虾\n\n## 这是什么\n高价值主题')

    const updated = await storage.updatePage({
      ...readBack,
      summary: '主人多次强调龙虾很重要',
      body: '# 龙虾\n\n## 对主人的意义\n会跨日反复提起',
      ownerConfirmed: true
    })

    const updatedReadBack = await storage.readPageByPath(updated.filePath)
    assert.equal(updatedReadBack.summary, '主人多次强调龙虾很重要')
    assert.equal(updatedReadBack.ownerConfirmed, true)
    assert.equal(updatedReadBack.body, '# 龙虾\n\n## 对主人的意义\n会跨日反复提起')

    console.log('verify-task055-memory-wiki-storage: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
