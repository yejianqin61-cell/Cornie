import fs from 'node:fs/promises'
import path from 'node:path'
import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function run() {
  const harness = await createServiceHarness('task349-identity-profile-upsert')
  const baseDir = harness.baseDir
  const memoryWiki = await createMemoryWikiService({ baseDir, store: harness.store })

  const first = await upsertIdentityProfileFromConversation(harness.store, {
    baseDir,
    date: '2026-06-30',
    messageId: 'msg-1',
    userMessage: '我叫叶健钦，我是你的创造者，也是你爸爸。'
  })

  assert(first.action === 'created', '首次身份声明应创建主身份页')

  const summaries = await memoryWiki.listSummaries({
    pageType: 'identity_profile',
    status: 'active'
  })
  assert(summaries.length === 1, '应存在唯一主身份页')

  const page = await memoryWiki.get(summaries[0].pageId)
  assert(page.userName === '叶健钦', '主身份页应写入用户名字')
  assert(page.cornieRelationship.includes('创造者') || page.cornieRelationship.includes('爸爸'), '主身份页应写入关系信息')

  const second = await upsertIdentityProfileFromConversation(harness.store, {
    baseDir,
    date: '2026-06-30',
    messageId: 'msg-2',
    userMessage: '以后你叫我爸爸。'
  })

  assert(['updated', 'noop'].includes(second.action), '补充称呼应更新或保持无噪音')

  const updatedPage = await memoryWiki.get(summaries[0].pageId)
  assert(updatedPage.preferredName === '爸爸', '主身份页应补充偏好称呼')

  const conflict = await upsertIdentityProfileFromConversation(harness.store, {
    baseDir,
    date: '2026-07-01',
    messageId: 'msg-3',
    userMessage: '我叫张三。'
  })

  assert(conflict.action === 'conflict', '冲突名字不应直接覆盖')

  const conflictedPage = await memoryWiki.get(summaries[0].pageId)
  assert(conflictedPage.userName === '叶健钦', '冲突后原名字应保持不变')

  const profileDir = path.join(baseDir, 'data', 'memory-wiki', 'pages', 'identity', 'profiles')
  const files = await fs.readdir(profileDir)
  assert(files.length >= 1, '应落地 identity profile markdown 文件')

  await harness.close()
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
