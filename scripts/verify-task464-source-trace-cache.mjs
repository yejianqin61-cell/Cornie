import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { saveMessage, deleteMessagesByDate } from '../electron/db.js'

async function run() {
  const harness = await createServiceHarness('task464-source-trace-cache')
  const memoryWiki = await createMemoryWikiService({
    baseDir: harness.baseDir,
    store: harness.store
  })

  try {
    // 造消息：同一天 2 条（m1/m2）+ 另一天 1 条（m3）
    saveMessage(harness.store, { id: 'm1', date: '2026-08-20', role: 'user', content: '第一条' })
    saveMessage(harness.store, { id: 'm2', date: '2026-08-20', role: 'user', content: '第二条' })
    saveMessage(harness.store, { id: 'm3', date: '2026-08-21', role: 'user', content: '第三天' })

    // 页面带 3 个聊天来源（同天两条 + 另一天一条）
    const page = await memoryWiki.create({
      pageType: 'event',
      title: '追溯页',
      summary: 's',
      sourceRefs: [
        { kind: 'chat', date: '2026-08-20', messageId: 'm1', title: '第一条', excerpt: '第一条' },
        { kind: 'chat', date: '2026-08-20', messageId: 'm2', title: '第二条', excerpt: '第二条' },
        { kind: 'chat', date: '2026-08-21', messageId: 'm3', title: '第三条', excerpt: '第三条' }
      ]
    })

    const trace1 = await memoryWiki.getPageSourceTrace(page.pageId)
    assert(trace1.chatSources.length === 3, '追溯应命中 3 个聊天来源', trace1.chatSources.length)
    assert(trace1.chatSources.every((item) => item.exists === true), '首次追溯所有来源应存在', trace1.chatSources)

    // 绕过 service 直接删掉 2026-08-20 的消息（模拟外部变更），缓存应让第二次追溯仍显示旧结果
    deleteMessagesByDate(harness.store, '2026-08-20')
    const trace2 = await memoryWiki.getPageSourceTrace(page.pageId)
    assert(trace2.chatSources.every((item) => item.exists === true), '追溯应命中缓存（外部变更不可见）', trace2.chatSources)

    // 写侧失效：update 页面后，追溯读到最新（m1/m2 已不可见）
    await memoryWiki.update({ pageId: page.pageId, summary: 's2' })
    const trace3 = await memoryWiki.getPageSourceTrace(page.pageId)
    const byDate20 = trace3.chatSources.filter((item) => item.date === '2026-08-20')
    assert(
      byDate20.length === 2 && byDate20.every((item) => item.exists === false),
      'update 后追溯应失效缓存并读到最新（同日来源不再存在）',
      byDate20
    )
    assert(trace3.chatSources.find((item) => item.date === '2026-08-21').exists === true, '另一天来源应仍存在', trace3.chatSources)

    console.log('verify-task464-source-trace-cache: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
