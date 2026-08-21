import fs from 'node:fs'
import path from 'node:path'

import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { repairSlugMismatches } from './repair-slug-mismatch.mjs'

async function run() {
  const harness = await createServiceHarness('task456-slug-repair')
  const memoryWiki = await createMemoryWikiService({
    baseDir: harness.baseDir,
    store: harness.store
  })

  try {
    // 1) 构造 slug 与 title 不一致的页面（模拟"啥名字啊"历史误提取）
    const mismatched = await memoryWiki.create({
      pageType: 'identity_profile',
      title: '叶健钦',
      slug: '啥名字啊',
      userName: '叶健钦',
      summary: '名字：叶健钦'
    })
    const originalPageId = mismatched.pageId

    // 2) 正常页面（slug 一致）不应被改动
    const normal = await memoryWiki.create({
      pageType: 'event',
      title: '正常事件',
      summary: '无问题'
    })

    const result = await repairSlugMismatches({ baseDir: harness.baseDir, store: harness.store })
    assert(result.fixed.length === 1, '应恰好修复 1 个页面', result)
    assert(result.fixed[0].pageId === originalPageId, 'pageId 应保持不变', result)

    // 3) 修复后：slug 与 title 一致、pageId 不变、新文件存在、旧文件删除
    const repaired = await memoryWiki.get(originalPageId)
    assert(repaired.slug === '叶健钦', 'slug 应重建为 title', repaired)
    assert(repaired.pageId === originalPageId, 'pageId 不应变化', repaired)

    const newPath = repaired.filePath
    assert(fs.existsSync(newPath), '新文件应存在', newPath)
    assert(path.basename(newPath) === '叶健钦.md', '新文件名应为 slug.md', newPath)
    const oldPath = result.fixed[0].oldPath
    assert(!fs.existsSync(oldPath), '旧文件应被删除', oldPath)

    // 4) 幂等：再次运行零变更
    const rerun = await repairSlugMismatches({ baseDir: harness.baseDir, store: harness.store })
    assert(rerun.fixed.length === 0, '再次运行应零变更', rerun)

    // 5) 正常页面未被误动
    const normalAfter = await memoryWiki.get(normal.pageId)
    assert(normalAfter.slug === '正常事件', '正常页面 slug 不应变化')

    console.log('verify-task456-slug-repair: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
