import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  assertPathWithinRoot,
  createMemoryWikiStorage,
  sanitizeFileSegment
} from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-056-'))

  try {
    const storage = await createMemoryWikiStorage(tempRoot)
    const pagesRoot = storage.getPagesRoot()

    assert.equal(sanitizeFileSegment('龙虾:主题?.md'), '龙虾-主题-.md')

    const safePath = assertPathWithinRoot(pagesRoot, path.join(pagesRoot, 'topics', 'lobster.md'))
    assert.ok(safePath.endsWith(path.join('topics', 'lobster.md')))

    assert.throws(
      () => assertPathWithinRoot(pagesRoot, path.join(pagesRoot, '..', '..', 'escape.md')),
      /escapes root/
    )

    const created = await storage.createPage({
      pageType: 'topic',
      title: '龙虾:主题?',
      body: '# 龙虾'
    })
    assert.ok(created.filename.includes('-'))
    assert.ok(await fs.stat(created.filePath))

    await assert.rejects(
      () =>
        storage.createPage({
          pageType: 'topic',
          title: '龙虾:主题?',
          slug: created.slug,
          body: '# 重复页面'
        }),
      /already exists/
    )

    const originalText = await fs.readFile(created.filePath, 'utf8')
    const updated = await storage.updatePage({
      ...created,
      body: '# 龙虾\n\n## 更新\n新的内容'
    })
    const updatedText = await fs.readFile(updated.filePath, 'utf8')

    assert.notEqual(updatedText, originalText)
    assert.ok(updatedText.includes('## 更新'))

    console.log('verify-task056-memory-wiki-safety: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
