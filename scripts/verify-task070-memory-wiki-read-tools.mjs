import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { registerTool, getTool } from '../electron/backend/tools/registry.js'
import { registerMemoryWikiTools } from '../electron/backend/memory-wiki/tools.js'
import { createMemoryWikiService, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-070-'))

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
      aliases: ['lobster'],
      memoryPageIds: [page.pageId]
    })

    await registerMemoryWikiTools({ baseDir: tempRoot }, { registerTool })

    const getPageTool = getTool('memory_wiki.get_page')
    const listPagesTool = getTool('memory_wiki.list_pages')
    const searchIndexTool = getTool('memory_wiki.search_topic_index')
    const listIndexTool = getTool('memory_wiki.list_topic_index')

    assert.ok(getPageTool)
    assert.ok(listPagesTool)
    assert.ok(searchIndexTool)
    assert.ok(listIndexTool)

    const pageResult = await getPageTool.handler({ pageId: page.pageId })
    assert.equal(pageResult.result.title, '龙虾')

    const pageListResult = await listPagesTool.handler({})
    assert.equal(pageListResult.result.length, 1)

    const indexResult = await searchIndexTool.handler({ normalizedKey: '龙虾' })
    assert.equal(indexResult.result.keyword, '龙虾')

    const indexListResult = await listIndexTool.handler({})
    assert.equal(indexListResult.result.length, 1)

    console.log('verify-task070-memory-wiki-read-tools: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
