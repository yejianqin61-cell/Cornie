import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-memory-wiki-109-'))

  try {
    const service = await createMemoryWikiService({ baseDir: tempRoot })

    const page = await service.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '原始摘要',
      body: '# 龙虾\n\n第一段。\n\n第二段。'
    })

    const governanceRequest = await service.createGovernanceRequest({
      requestType: 'compression_candidate',
      triggerSource: 'inspection',
      queueSection: 'archive_candidates',
      pageIds: [page.pageId],
      title: '龙虾页面可压缩',
      reason: '连续重复事实可压缩',
      evidence: [{ kind: 'repeat_summary', count: 3 }]
    })
    assert.equal(governanceRequest.requestType, 'compression_candidate')

    const compressed = await service.compressPage({
      pageId: page.pageId,
      summary: '压缩后摘要',
      body: '# 龙虾\n\n阶段总结。'
    })

    assert.equal(compressed.summary, '压缩后摘要')
    assert.equal(compressed.body, '# 龙虾\n\n阶段总结。')

    const versions = await service.listVersions(page.pageId)
    assert.ok(versions.some((item) => item.reason === 'before_compression'))
    assert.ok(versions.some((item) => item.reason === 'after_compression'))

    const beforeCompression = versions.find((item) => item.reason === 'before_compression')
    assert.ok(beforeCompression)

    const rolledBack = await service.rollback(page.pageId, beforeCompression.versionId)
    assert.equal(rolledBack.summary, '原始摘要')

    const auditEvents = await service.listAuditEvents({ limit: 20 })
    assert.ok(auditEvents.some((item) => item.eventType === 'page_compressed'))

    console.log('verify-task109-memory-wiki-compression: passed')
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
