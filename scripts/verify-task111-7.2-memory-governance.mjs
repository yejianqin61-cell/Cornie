import assert from 'node:assert/strict'
import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

const execFile = promisify(execFileCallback)

async function runTaskScript(taskName) {
  await execFile('cmd.exe', ['/c', 'npm.cmd', 'run', taskName], {
    cwd: process.cwd(),
    windowsHide: true
  })
}

async function main() {
  const subtasks = [
    'verify:task105',
    'verify:task106',
    'verify:task107',
    'verify:task108',
    'verify:task109',
    'verify:task110'
  ]

  for (const taskName of subtasks) {
    await runTaskScript(taskName)
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-7-2-111-'))

  try {
    const service = await createMemoryWikiService({ baseDir: tempRoot })

    assert.equal(typeof service.createGovernanceRequest, 'function')
    assert.equal(typeof service.listGovernanceRequests, 'function')
    assert.equal(typeof service.demote, 'function')
    assert.equal(typeof service.compressPage, 'function')
    assert.equal(typeof service.enqueueInspectionGovernanceRequests, 'function')

    const governanceRequest = await service.createGovernanceRequest({
      requestType: 'compression_candidate',
      triggerSource: 'dialogue',
      queueSection: 'archive_candidates',
      pageIds: ['topic_lobster']
    })
    assert.equal(governanceRequest.status, 'pending')

    const page = await service.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '长期主题',
      body: '# 龙虾'
    })
    assert.equal(page.status, 'active')

    const inactive = await service.demote(page.pageId)
    assert.equal(inactive.status, 'inactive')

    const compressed = await service.compressPage({
      pageId: page.pageId,
      summary: '压缩后摘要',
      body: '# 龙虾\n\n阶段总结'
    })
    assert.equal(compressed.summary, '压缩后摘要')

    const topicIndex = service.getTopicIndex()
    await topicIndex.upsert({
      keyword: '龙虾',
      dates: ['2026-06-27'],
      importance: 'high',
      pinned: true
    })
    const listedTopics = await topicIndex.list()
    assert.ok(listedTopics[0].heatScore >= 0)

    console.log('verify-task111-7.2-memory-governance: passed')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error('verify-task111-7.2-memory-governance: failed')
  console.error(error?.message ?? error)
  process.exit(1)
})
