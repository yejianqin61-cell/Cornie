import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { registerTool, getTool } from '../electron/backend/tools/registry.js'
import { registerMemoryWikiTools } from '../electron/backend/memory-wiki/tools.js'
import { createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-072-'))

  try {
    await registerMemoryWikiTools({ baseDir: tempRoot }, { registerTool })

    const createTool = getTool('memory_wiki.create_page')
    const mergeTool = getTool('memory_wiki.merge_pages')
    const linkRelatedTool = getTool('memory_wiki.link_related_pages')
    const updateIndexAliasesTool = getTool('memory_index.update_aliases')
    const linkIndexPageTool = getTool('memory_index.link_page')

    const target = await createTool.handler({
      pageType: 'topic',
      title: '龙虾',
      summary: '目标页',
      body: '# 龙虾'
    })
    const source = await createTool.handler({
      pageType: 'topic',
      title: '小龙虾',
      summary: '源页',
      body: '# 小龙虾'
    })

    const linked = await linkRelatedTool.handler({
      pageId: target.result.pageId,
      relatedPageIds: [source.result.pageId]
    })
    assert.deepEqual(linked.result.relatedPageIds, [source.result.pageId])

    const merged = await mergeTool.handler({
      targetPageId: target.result.pageId,
      sourcePageId: source.result.pageId
    })
    assert.equal(merged.result.archivedSourcePageId, source.result.pageId)
    assert.ok(merged.result.target.body.includes('# 小龙虾'))

    const topicIndex = await createTopicIndexStore(tempRoot)
    await topicIndex.upsert({ keyword: '龙虾' })

    const aliasResult = await updateIndexAliasesTool.handler({
      normalizedKey: '龙虾',
      aliases: ['lobster', '小龙虾']
    })
    assert.deepEqual(aliasResult.result.aliases, ['lobster', '小龙虾'])

    const linkPageResult = await linkIndexPageTool.handler({
      normalizedKey: '龙虾',
      pageId: target.result.pageId
    })
    assert.deepEqual(linkPageResult.result.memoryPageIds, [target.result.pageId])

    console.log('verify-task072-memory-wiki-merge-tools: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
