import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { getToolRiskLevel } from '../electron/backend/policy/riskLevels.js'
import { evaluateToolRule } from '../electron/backend/policy/rules.js'
import { registerTool } from '../electron/backend/tools/registry.js'
import { registerMemoryWikiTools } from '../electron/backend/memory-wiki/tools.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-078-'))
  await registerMemoryWikiTools({ baseDir: tempRoot }, { registerTool })

  assert.equal(getToolRiskLevel('memory_wiki.get_page'), 'low')
  assert.equal(getToolRiskLevel('memory_wiki.list_pages'), 'low')
  assert.equal(getToolRiskLevel('memory_wiki.create_page'), 'high')
  assert.equal(getToolRiskLevel('memory_wiki.merge_pages'), 'high')
  assert.equal(getToolRiskLevel('memory_index.link_page'), 'high')

  const readDecision = evaluateToolRule(
    {
      tool_name: 'memory_wiki.get_page',
      arguments: { pageId: 'topic_lobster' }
    },
    '看看龙虾页面'
  )
  assert.equal(readDecision.decision, 'allow')

  const writeDecision = evaluateToolRule(
    {
      tool_name: 'memory_wiki.create_page',
      arguments: { pageType: 'topic', title: '龙虾' }
    },
    '把龙虾记下来'
  )
  assert.equal(writeDecision.decision, 'confirm')
  assert.equal(writeDecision.confirmRequest.toolName, 'memory_wiki.create_page')

  const mergeDecision = evaluateToolRule(
    {
      tool_name: 'memory_wiki.merge_pages',
      arguments: { targetPageId: 'topic_lobster', sourcePageId: 'topic_crayfish' }
    },
    '合并龙虾和小龙虾'
  )
  assert.equal(mergeDecision.decision, 'confirm')

  console.log('verify-task078-memory-wiki-policy-risk: ok')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
