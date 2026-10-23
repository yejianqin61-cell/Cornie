import { createMemoryWikiService } from './service.js'

const DEMO_PAGES = [
  {
    pageId: 'demo_person_lin',
    pageType: 'identity_person',
    title: '林姐',
    personName: '林姐',
    relationshipToUser: '项目搭档',
    roleSummary: '一起推进作品集项目的同事',
    summary: '项目搭档林姐，重视清晰的合作边界。',
    body: '林姐是主人作品集项目的搭档。沟通时先明确范围和交付时间。',
    importance: 'high',
    ownerConfirmed: true,
  },
  {
    pageId: 'demo_preference_coffee',
    pageType: 'identity_preference',
    title: '咖啡偏好',
    stance: '喜欢',
    preferenceType: '饮品',
    summary: '主人喜欢拿铁，下午喝咖啡会影响睡眠。',
    body: '优先推荐拿铁；下午需要咖啡时，先提醒睡眠影响。',
    importance: 'medium',
    ownerConfirmed: true,
  },
  {
    pageId: 'demo_event_portfolio',
    pageType: 'event',
    title: '作品集答辩',
    summary: '主人计划在 2026-11-05 完成作品集答辩。',
    body: '答辩前需要和林姐确认演示范围，并预留一次彩排。',
    importance: 'high',
  },
  {
    pageId: 'demo_topic_scope_conflict',
    pageType: 'topic',
    title: '作品集范围冲突',
    summary: '答辩功能范围与彩排时间存在冲突，需由主人决定取舍。',
    body: '冲突：增加功能会压缩彩排时间。默认优先保证可演示主链。',
    importance: 'high',
  },
]

export async function loadDemoMemorySet({ baseDir, store } = {}) {
  if (!baseDir) throw new Error('demo memory baseDir is required')
  const memoryWiki = await createMemoryWikiService({ baseDir, store })
  let createdCount = 0

  for (const page of DEMO_PAGES) {
    if (await memoryWiki.get(page.pageId)) continue
    await memoryWiki.create(page)
    createdCount += 1
  }

  return { createdCount, pageIds: DEMO_PAGES.map((page) => page.pageId) }
}

export async function resetDemoMemorySet({ baseDir, store } = {}) {
  if (!baseDir) throw new Error('demo memory baseDir is required')
  const memoryWiki = await createMemoryWikiService({ baseDir, store })
  let deletedCount = 0

  for (const page of DEMO_PAGES) {
    if (await memoryWiki.delete(page.pageId)) {
      deletedCount += 1
    }
  }

  return { deletedCount, pageIds: DEMO_PAGES.map((page) => page.pageId) }
}
