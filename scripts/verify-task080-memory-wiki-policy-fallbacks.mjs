import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { registerTool } from '../electron/backend/tools/registry.js'
import { registerMemoryWikiTools } from '../electron/backend/memory-wiki/tools.js'
import { evaluateToolRule } from '../electron/backend/policy/rules.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-080-'))
  await registerMemoryWikiTools({ baseDir: tempRoot }, { registerTool })

  const mergeMissing = evaluateToolRule(
    {
      tool_name: 'memory_wiki.merge_pages',
      arguments: { targetPageId: 'topic_lobster' }
    },
    '合并龙虾页面'
  )
  assert.equal(mergeMissing.decision, 'ask_back')

  const mergeSame = evaluateToolRule(
    {
      tool_name: 'memory_wiki.merge_pages',
      arguments: { targetPageId: 'topic_lobster', sourcePageId: 'topic_lobster' }
    },
    '把它自己合并到自己'
  )
  assert.equal(mergeSame.decision, 'deny')

  const rollbackMissing = evaluateToolRule(
    {
      tool_name: 'memory_wiki.rollback_page',
      arguments: { pageId: 'topic_lobster' }
    },
    '回滚龙虾页面'
  )
  assert.equal(rollbackMissing.decision, 'ask_back')

  const indexMissing = evaluateToolRule(
    {
      tool_name: 'memory_index.link_page',
      arguments: { normalizedKey: '龙虾' }
    },
    '把龙虾索引关联到页面'
  )
  assert.equal(indexMissing.decision, 'ask_back')

  console.log('verify-task080-memory-wiki-policy-fallbacks: ok')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
