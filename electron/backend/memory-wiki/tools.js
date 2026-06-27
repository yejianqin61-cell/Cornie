import { createMemoryWikiService } from './service.js'
import { createTopicIndexStore } from './topicIndex.js'

export async function registerMemoryWikiTools({ baseDir }, { registerTool }) {
  const memoryWiki = await createMemoryWikiService({ baseDir })
  const topicIndex = await createTopicIndexStore(baseDir)

  registerTool({
    name: 'memory_wiki.get_page',
    description: '根据 pageId 查询长期记忆 wiki 页面',
    riskLevel: 'low',
    handler: async ({ pageId }) => ({ ok: true, result: await memoryWiki.get(pageId) })
  })

  registerTool({
    name: 'memory_wiki.list_pages',
    description: '列出长期记忆 wiki 页面',
    riskLevel: 'low',
    handler: async (args = {}) => ({ ok: true, result: await memoryWiki.listSummaries(args) })
  })

  registerTool({
    name: 'memory_wiki.search_topic_index',
    description: '根据关键词查询主题索引',
    riskLevel: 'low',
    handler: async ({ normalizedKey }) => ({ ok: true, result: await topicIndex.get(normalizedKey) })
  })

  registerTool({
    name: 'memory_wiki.list_topic_index',
    description: '列出主题索引项',
    riskLevel: 'low',
    handler: async () => ({ ok: true, result: await topicIndex.list() })
  })

  registerTool({
    name: 'memory_wiki.create_page',
    description: '创建长期记忆 wiki 页面',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: await memoryWiki.create(args) })
  })

  registerTool({
    name: 'memory_wiki.update_page',
    description: '更新长期记忆 wiki 页面',
    riskLevel: 'high',
    handler: async (args) => ({ ok: true, result: await memoryWiki.update(args) })
  })

  registerTool({
    name: 'memory_wiki.update_summary',
    description: '更新长期记忆 wiki 页面摘要',
    riskLevel: 'high',
    handler: async ({ pageId, summary }) => ({ ok: true, result: await memoryWiki.updateSummary(pageId, summary) })
  })

  registerTool({
    name: 'memory_wiki.update_aliases',
    description: '更新长期记忆 wiki 页面别名',
    riskLevel: 'high',
    handler: async ({ pageId, aliases }) => ({ ok: true, result: await memoryWiki.updateAliases(pageId, aliases) })
  })

  registerTool({
    name: 'memory_wiki.set_status',
    description: '设置长期记忆 wiki 页面状态',
    riskLevel: 'high',
    handler: async ({ pageId, status }) => ({ ok: true, result: await memoryWiki.setStatus(pageId, status) })
  })

  registerTool({
    name: 'memory_wiki.set_importance',
    description: '设置长期记忆 wiki 页面重要性',
    riskLevel: 'high',
    handler: async ({ pageId, importance }) => ({ ok: true, result: await memoryWiki.setImportance(pageId, importance) })
  })

  registerTool({
    name: 'memory_wiki.archive_page',
    description: '归档长期记忆 wiki 页面',
    riskLevel: 'high',
    handler: async ({ pageId }) => ({ ok: true, result: await memoryWiki.archive(pageId) })
  })

  registerTool({
    name: 'memory_wiki.restore_page',
    description: '恢复长期记忆 wiki 页面',
    riskLevel: 'high',
    handler: async ({ pageId }) => ({ ok: true, result: await memoryWiki.restore(pageId) })
  })

  registerTool({
    name: 'memory_wiki.rollback_page',
    description: '回滚长期记忆 wiki 页面到指定版本',
    riskLevel: 'high',
    handler: async ({ pageId, versionId }) => ({ ok: true, result: await memoryWiki.rollback(pageId, versionId) })
  })

  registerTool({
    name: 'memory_wiki.link_related_pages',
    description: '维护长期记忆 wiki 页面关联',
    riskLevel: 'high',
    handler: async ({ pageId, relatedPageIds }) => ({ ok: true, result: await memoryWiki.linkRelatedPages(pageId, relatedPageIds) })
  })

  registerTool({
    name: 'memory_wiki.merge_pages',
    description: '合并长期记忆 wiki 页面',
    riskLevel: 'high',
    handler: async ({ targetPageId, sourcePageId }) => ({
      ok: true,
      result: await memoryWiki.mergePages({ targetPageId, sourcePageId })
    })
  })

  registerTool({
    name: 'memory_index.update_aliases',
    description: '更新主题索引别名',
    riskLevel: 'high',
    handler: async ({ normalizedKey, aliases }) => ({ ok: true, result: await topicIndex.updateAliases(normalizedKey, aliases) })
  })

  registerTool({
    name: 'memory_index.link_page',
    description: '将主题索引关联到指定 wiki 页面',
    riskLevel: 'high',
    handler: async ({ normalizedKey, pageId }) => ({ ok: true, result: await topicIndex.linkPage(normalizedKey, pageId) })
  })
}
