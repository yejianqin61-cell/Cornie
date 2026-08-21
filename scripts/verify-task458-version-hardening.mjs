import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function run() {
  const harness = await createServiceHarness('task458-version-hardening')
  const memoryWiki = await createMemoryWikiService({
    baseDir: harness.baseDir,
    store: harness.store
  })

  try {
    // 1) 造页 + 多次更新（每个 update 产生 before 快照）
    const created = await memoryWiki.create({
      pageType: 'event',
      title: '版本测试',
      summary: 'v1',
      body: '第一行\n第二行'
    })
    await memoryWiki.update({ pageId: created.pageId, summary: 'v2', body: '第一行\n第二行改' })

    const versions = await memoryWiki.listVersions(created.pageId)
    assert(versions.length >= 1, '应存在版本快照', versions.length)

    // 2) 字段级 diff（版本间）
    const v1 = versions[0]
    const diff = await memoryWiki.getVersionDiff({
      pageId: created.pageId,
      fromVersionId: v1.versionId,
      toVersionId: 'current'
    })
    assert(Array.isArray(diff.changedFields) && diff.changedFields.length > 0, '应输出字段级 changedFields', diff)
    assert(diff.summaryChanged === true || diff.bodyChanged === true, 'summary/body 变更应被检出', diff)
    assert(Array.isArray(diff.bodyAddedLines) && Array.isArray(diff.bodyRemovedLines), '应输出行级正文差异', diff)

    // 3) current diff 不自比：from 与 to 不同 → 至少一个 changed
    assert(diff.fromVersionId === v1.versionId && diff.toVersionId === 'current', 'current diff 语义正确', diff)

    // 4) 保留上限：制造超过上限的版本
    const capPage = await memoryWiki.create({ pageType: 'event', title: '上限测试', summary: 'start' })
    for (let i = 0; i < 55; i += 1) {
      await memoryWiki.update({ pageId: capPage.pageId, summary: `s${i}` })
    }
    const cappedVersions = await memoryWiki.listVersions(capPage.pageId)
    assert(cappedVersions.length <= 50, '版本数应受上限约束', cappedVersions.length)

    // 5) 回滚只产生 before 快照（不再 after），且受上限约束
    const beforeRollback = (await memoryWiki.listVersions(capPage.pageId)).length
    const target = (await memoryWiki.listVersions(capPage.pageId)).slice(-1)[0]
    await memoryWiki.rollback(capPage.pageId, target.versionId)
    const afterVersions = await memoryWiki.listVersions(capPage.pageId)
    assert(afterVersions.length <= 50, '回滚后版本数仍受上限约束', afterVersions.length)
    assert(afterVersions.slice(-1)[0].reason === 'before_rollback', '回滚应新增 before 快照', afterVersions.slice(-1)[0])
    assert(
      afterVersions.length === Math.min(beforeRollback + 1, 50),
      '回滚版本增量应为 1（before），无 after 快照',
      { beforeRollback, after: afterVersions.length }
    )

    console.log('verify-task458-version-hardening: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
