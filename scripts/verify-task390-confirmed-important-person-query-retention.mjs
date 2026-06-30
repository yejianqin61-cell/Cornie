import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { buildWikiContext } from '../electron/backend/agent/wikiContext.js'

async function run() {
  const harness = await createServiceHarness('task390-confirmed-important-person-query-retention')

  try {
    const memoryWiki = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })

    await memoryWiki.create({
      pageType: 'identity_profile',
      title: '叶健钦',
      userName: '叶健钦',
      importance: 'critical',
      ownerConfirmed: true,
      summary: '主身份摘要'
    })

    await memoryWiki.create({
      pageType: 'identity_person',
      title: '钟奕菲',
      personName: '钟奕菲',
      relationshipToUser: '初恋',
      roleSummary: '对用户很重要的人物',
      sharedExperienceSummary: '2021年冬天相恋，2022年春夏疏远与决裂。',
      importance: 'critical',
      ownerConfirmed: true,
      summary: '重要人物摘要'
    })

    await memoryWiki.create({
      pageType: 'identity_person',
      title: '阿未确认',
      personName: '阿未确认',
      relationshipToUser: '朋友',
      importance: 'high',
      ownerConfirmed: false,
      summary: '未确认人物摘要'
    })

    for (let index = 0; index < 4; index += 1) {
      await memoryWiki.create({
        pageType: 'identity_preference',
        title: `偏好命中${index}`,
        stance: '喜欢',
        preferenceType: '交流',
        triggerKeywords: ['钟奕菲', '温柔', `偏好${index}`],
        importance: 'high',
        ownerConfirmed: true,
        summary: `偏好摘要${index}`
      })
    }

    const relatedContext = await buildWikiContext(harness.store, {
      date: '2026-06-30',
      baseDir: harness.baseDir,
      query: '钟奕菲对我很重要，我还是会想起她',
      pageLimit: 4,
      topicLimit: 4
    })
    assert(relatedContext.memorySummary.includes('[person] 钟奕菲'), '命中人物 query 时，高权重已确认人物页应保留轻量痕迹')

    const unrelatedContext = await buildWikiContext(harness.store, {
      date: '2026-06-30',
      baseDir: harness.baseDir,
      query: '我想聊聊奶茶和说话风格',
      pageLimit: 4,
      topicLimit: 4
    })
    assert(!unrelatedContext.memorySummary.includes('[person] 钟奕菲'), '无关 query 下不应强行塞入无关人物页')

    const unconfirmedContext = await buildWikiContext(harness.store, {
      date: '2026-06-30',
      baseDir: harness.baseDir,
      query: '阿未确认这个朋友也很重要',
      pageLimit: 4,
      topicLimit: 4
    })
    const confirmedContext = await buildWikiContext(harness.store, {
      date: '2026-06-30',
      baseDir: harness.baseDir,
      query: '钟奕菲和阿未确认这两个人对我都很重要',
      pageLimit: 4,
      topicLimit: 4
    })
    assert(confirmedContext.memorySummary.includes('[person] 钟奕菲'), '已确认高权重人物在多人混合 query 下仍应稳定保留')
    assert(
      !confirmedContext.selectedPages
        .slice(0, 2)
        .some((item) => item.pageType === 'identity_person' && item.title === '阿未确认'),
      '未确认人物不应抢占已确认高权重人物的稳定保留位'
    )

    console.log('verify-task390-confirmed-important-person-query-retention: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
