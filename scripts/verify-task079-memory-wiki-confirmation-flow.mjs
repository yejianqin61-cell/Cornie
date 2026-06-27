import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { registerTool } from '../electron/backend/tools/registry.js'
import { registerMemoryWikiTools } from '../electron/backend/memory-wiki/tools.js'
import { evaluateToolCalls } from '../electron/backend/policy/toolPolicy.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-079-'))
  await registerMemoryWikiTools({ baseDir: tempRoot }, { registerTool })

  const createDecision = evaluateToolCalls(
    [
      {
        tool_name: 'memory_wiki.create_page',
        arguments: { pageType: 'topic', title: '龙虾' }
      }
    ],
    { sourceText: '把龙虾记住' }
  )
  assert.equal(createDecision.decision, 'confirm')
  assert.equal(createDecision.confirmRequest.toolName, 'memory_wiki.create_page')

  const mergeDecision = evaluateToolCalls(
    [
      {
        tool_name: 'memory_wiki.merge_pages',
        arguments: { targetPageId: 'topic_lobster', sourcePageId: 'topic_crayfish' }
      }
    ],
    { sourceText: '把龙虾和小龙虾合并' }
  )
  assert.equal(mergeDecision.decision, 'confirm')
  assert.match(mergeDecision.confirmRequest.reason, /合并/)

  const rollbackDecision = evaluateToolCalls(
    [
      {
        tool_name: 'memory_wiki.rollback_page',
        arguments: { pageId: 'topic_lobster', versionId: 'ver_001' }
      }
    ],
    { sourceText: '回滚龙虾页面' }
  )
  assert.equal(rollbackDecision.decision, 'confirm')
  assert.match(rollbackDecision.confirmRequest.reason, /回滚/)

  console.log('verify-task079-memory-wiki-confirmation-flow: ok')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
