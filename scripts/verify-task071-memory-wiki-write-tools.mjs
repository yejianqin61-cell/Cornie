import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { registerTool, getTool } from '../electron/backend/tools/registry.js'
import { registerMemoryWikiTools } from '../electron/backend/memory-wiki/tools.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-071-'))

  try {
    await registerMemoryWikiTools({ baseDir: tempRoot }, { registerTool })

    const createTool = getTool('memory_wiki.create_page')
    const updateTool = getTool('memory_wiki.update_page')
    const updateSummaryTool = getTool('memory_wiki.update_summary')
    const setStatusTool = getTool('memory_wiki.set_status')
    const rollbackTool = getTool('memory_wiki.rollback_page')

    assert.equal(createTool?.riskLevel, 'high')
    assert.equal(updateTool?.riskLevel, 'high')
    assert.equal(updateSummaryTool?.riskLevel, 'high')
    assert.equal(setStatusTool?.riskLevel, 'high')
    assert.equal(rollbackTool?.riskLevel, 'high')

    const created = await createTool.handler({
      pageType: 'topic',
      title: '龙虾',
      summary: '第一版',
      body: '# 龙虾'
    })
    assert.equal(created.result.title, '龙虾')

    const updatedSummary = await updateSummaryTool.handler({
      pageId: created.result.pageId,
      summary: '第二版摘要'
    })
    assert.equal(updatedSummary.result.summary, '第二版摘要')

    const archived = await setStatusTool.handler({
      pageId: created.result.pageId,
      status: 'archived'
    })
    assert.equal(archived.result.status, 'archived')

    console.log('verify-task071-memory-wiki-write-tools: ok')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
