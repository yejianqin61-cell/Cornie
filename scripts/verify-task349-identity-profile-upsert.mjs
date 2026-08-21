import fs from 'node:fs/promises'
import path from 'node:path'
import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { upsertIdentityProfileFromConversation } from '../electron/backend/identity/profileUpsert.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { buildWikiContext } from '../electron/backend/agent/wikiContext.js'

async function run() {
  const harness = await createServiceHarness('task349-identity-profile-upsert')
  const baseDir = harness.baseDir
  const memoryWiki = await createMemoryWikiService({ baseDir, store: harness.store })

  const first = await upsertIdentityProfileFromConversation(harness.store, {
    baseDir,
    date: '2026-06-30',
    messageId: 'msg-1',
    userMessage: '我叫叶健钦，我是你的创造者，也是你爸爸。',
    candidate: {
      userName: '叶健钦',
      cornieRelationship: '用户是 Cornie 的创造者和爸爸'
    }
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
    userMessage: '以后你叫我爸爸。',
    candidate: {
      userName: '叶健钦',
      preferredName: '爸爸'
    }
  })

  assert(['updated', 'noop'].includes(second.action), '补充称呼应更新或保持无噪音')

  const updatedPage = await memoryWiki.get(summaries[0].pageId)
  assert(updatedPage.preferredName === '爸爸', '主身份页应补充偏好称呼')

  const stageWrite = await upsertIdentityProfileFromConversation(harness.store, {
    baseDir,
    date: '2026-07-01',
    messageId: 'msg-2b',
    userMessage: '我最近好多项目、考试、assignment，还要找实习，压力真的很大。我希望你温柔一点，记住上下文。',
    candidate: {
      userName: '叶健钦',
      lifeStageSummary: '用户处于学业与项目并行的繁忙阶段，需兼顾考试、assignment 与实习求职',
      currentFocus: '项目推进；考试与学业；实习与求职',
      stressors: '项目推进压力；考试与学业压力；实习与求职压力',
      communicationPreference: '偏好温柔表达；希望被稳定记住上下文'
    }
  })

  assert(['updated', 'noop'].includes(stageWrite.action), '阶段画像类信息应能保守写入主身份页')

  const enrichedPage = await memoryWiki.get(summaries[0].pageId)
  assert(enrichedPage.lifeStageSummary.includes('学业') || enrichedPage.lifeStageSummary.includes('项目'), '主身份页应写入阶段画像摘要')
  assert(enrichedPage.currentFocus.includes('项目') || enrichedPage.currentFocus.includes('实习'), '主身份页应写入当前关注点')
  assert(enrichedPage.stressors.length > 0, '主身份页应写入压力来源')
  assert(enrichedPage.communicationPreference.length > 0, '主身份页应写入沟通偏好')

  const unrelatedContext = await buildWikiContext(harness.store, {
    date: '2026-07-01',
    baseDir,
    query: ''
  })
  assert(!unrelatedContext.memorySummary.includes('沟通偏好：'), '无关 query 时不应默认展开沟通偏好')
  assert(!unrelatedContext.memorySummary.includes('压力：'), '无关 query 时不应默认展开压力细节')

  const relatedContext = await buildWikiContext(harness.store, {
    date: '2026-07-01',
    baseDir,
    query: '最近压力很大 项目 实习 温柔 记住上下文'
  })
  assert(relatedContext.memorySummary.includes('压力：'), '相关 query 时应展开压力细节')
  assert(relatedContext.memorySummary.includes('沟通偏好：'), '相关 query 时应展开沟通偏好')

  const conflict = await upsertIdentityProfileFromConversation(harness.store, {
    baseDir,
    date: '2026-07-01',
    messageId: 'msg-3',
    userMessage: '我叫张三。',
    candidate: {
      userName: '张三'
    }
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
