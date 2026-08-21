import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function run() {
  const harness = await createServiceHarness('task463-list-pagination')
  const memoryWiki = await createMemoryWikiService({
    baseDir: harness.baseDir,
    store: harness.store
  })

  try {
    for (let i = 0; i < 12; i += 1) {
      await memoryWiki.create({ pageType: 'event', title: `事件${String(i).padStart(2, '0')}`, summary: `s${i}` })
    }

    // 1) 无分页：全量
    const all = await memoryWiki.listSummaries({})
    assert(all.length === 12, '无分页应返回全部', all.length)

    // 2) limit
    const limited = await memoryWiki.listSummaries({}, { hydrate: false })
    const limitedWithLimit = await memoryWiki.list({ limit: 5 })
    assert(limitedWithLimit.length === 5, 'limit=5 应返回 5 条', limitedWithLimit.length)

    // 3) offset
    const paged = await memoryWiki.list({ limit: 5, offset: 5 })
    assert(paged.length === 5, 'offset=5 limit=5 应返回 5 条', paged.length)
    assert(paged[0].title === '事件05', '第二页首条应为事件05', paged[0])

    // 4) hydrate:false 轻量摘要：字段存在但无正文类字段（按需延迟读取）
    const light = await memoryWiki.listSummaries({ limit: 3 }, { hydrate: false })
    assert(light.length === 3, '轻量摘要应支持分页', light.length)
    assert(light[0].pageId && light[0].title, '轻量摘要应含索引字段', light[0])
    assert(light[0].summary === undefined || light[0].summary === '', '轻量摘要不应含正文类字段', light[0])

    // 5) 轻量摘要不逐页读文件：直接验证其 pageId 可被 get 拉全量（按需读取路径）
    const full = await memoryWiki.get(light[0].pageId)
    assert(full.summary === 's0', '按需 get 应能取到完整摘要', full.summary)

    console.log('verify-task463-list-pagination: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
