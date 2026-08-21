import { getObservationLog, getMessagesByDate } from '../../db.js'

function normalizeString(value) {
  return String(value ?? '').trim()
}

function buildRepairSuggestion(kind, target, reason) {
  return {
    kind,
    target,
    reason
  }
}

function parseChatRef(value) {
  const text = normalizeString(value)
  const [date, messageId] = text.split('#')
  return {
    date: normalizeString(date),
    messageId: normalizeString(messageId)
  }
}

function parseObservationRef(value) {
  const text = normalizeString(value)
  const [date, observationId] = text.split('#')
  return {
    date: normalizeString(date),
    observationId: normalizeString(observationId)
  }
}

function buildTopicIssueContext(topic) {
  return {
    normalizedKey: normalizeString(topic?.normalizedKey),
    keyword: normalizeString(topic?.keyword),
    aliases: Array.isArray(topic?.aliases) ? topic.aliases.map((item) => normalizeString(item)).filter(Boolean) : [],
    memoryPageIds: Array.isArray(topic?.memoryPageIds)
      ? topic.memoryPageIds.map((item) => normalizeString(item)).filter(Boolean)
      : []
  }
}

export async function createMemoryWikiInspector({ store, memoryWikiService, topicIndex }) {
  if (!store) throw new Error('store is required')
  if (!memoryWikiService) throw new Error('memoryWikiService is required')
  if (!topicIndex) throw new Error('topicIndex is required')

  // 460：单次遍历——list() 只读 page-index 轻索引，再统一 hydrate 一次，
  // 避免"listSummaries（内部已逐页读取）+ 再逐个 get"的双重全量扫描。
  async function listPages() {
    const summaries = await memoryWikiService.list({})
    const pages = await Promise.all(summaries.map((item) => memoryWikiService.get(item.pageId)))
    return pages.filter(Boolean)
  }

  return {
    async inspectBrokenLinks() {
      const pages = await listPages()
      const pageIds = new Set(pages.map((page) => page.pageId))
      const topics = await topicIndex.list()
      const issues = []

      for (const topic of topics) {
        for (const pageId of topic.memoryPageIds ?? []) {
          if (!pageIds.has(pageId)) {
            issues.push({
              issueType: 'missing_topic_page_link',
              normalizedKey: topic.normalizedKey,
              pageId,
              suggestion: buildRepairSuggestion('unlink_topic_page', { normalizedKey: topic.normalizedKey, pageId }, '主题索引指向的页面不存在')
            })
          }
        }

        for (const chatRef of topic.chatRefs ?? []) {
          const parsed = parseChatRef(chatRef)
          const messages = parsed.date ? getMessagesByDate(store, parsed.date) : []
          const matchedMessage = messages.find((item) => item.id === parsed.messageId)
          if (!matchedMessage) {
            issues.push({
              issueType: 'missing_topic_chat_ref',
              normalizedKey: topic.normalizedKey,
              keyword: topic.keyword,
              chatRef,
              parsedRef: parsed,
              refDate: parsed.date,
              refId: parsed.messageId,
              exists: false,
              preview: '',
              topicContext: buildTopicIssueContext(topic),
              suggestion: buildRepairSuggestion(
                'unlink_topic_chat_ref',
                {
                  normalizedKey: topic.normalizedKey,
                  keyword: topic.keyword,
                  chatRef,
                  parsedRef: parsed
                },
                '主题索引聊天引用失效'
              )
            })
          }
        }

        for (const observationRef of topic.observationRefs ?? []) {
          const parsed = parseObservationRef(observationRef)
          const observation = parsed.observationId ? getObservationLog(store, parsed.observationId) : null
          if (!parsed.observationId || !observation) {
            issues.push({
              issueType: 'missing_topic_observation_ref',
              normalizedKey: topic.normalizedKey,
              keyword: topic.keyword,
              observationRef,
              parsedRef: parsed,
              refDate: parsed.date,
              refId: parsed.observationId,
              exists: false,
              preview: '',
              topicContext: buildTopicIssueContext(topic),
              suggestion: buildRepairSuggestion(
                'unlink_topic_observation_ref',
                {
                  normalizedKey: topic.normalizedKey,
                  keyword: topic.keyword,
                  observationRef,
                  parsedRef: parsed
                },
                '主题索引观察引用失效'
              )
            })
          }
        }
      }

      for (const page of pages) {
        for (const relatedPageId of page.relatedPageIds ?? []) {
          if (!pageIds.has(relatedPageId)) {
            issues.push({
              issueType: 'missing_related_page',
              pageId: page.pageId,
              relatedPageId,
              suggestion: buildRepairSuggestion('remove_related_page', { pageId: page.pageId, relatedPageId }, '页面 relatedPageIds 指向不存在页面')
            })
          }
        }

        for (const sourceRef of page.sourceRefs ?? []) {
          if (sourceRef?.kind === 'chat') {
            const messages = sourceRef.date ? getMessagesByDate(store, sourceRef.date) : []
            if (!messages.find((item) => item.id === sourceRef.messageId)) {
              issues.push({
                issueType: 'missing_page_chat_source',
                pageId: page.pageId,
                sourceRef,
                suggestion: buildRepairSuggestion('remove_page_source_ref', { pageId: page.pageId, sourceRef }, '页面聊天来源引用失效')
              })
            }
          }

          if (sourceRef?.kind === 'observation') {
            if (!getObservationLog(store, sourceRef.observationId)) {
              issues.push({
                issueType: 'missing_page_observation_source',
                pageId: page.pageId,
                sourceRef,
                suggestion: buildRepairSuggestion('remove_page_source_ref', { pageId: page.pageId, sourceRef }, '页面观察来源引用失效')
              })
            }
          }
        }
      }

      return {
        issueCount: issues.length,
        issues
      }
    },

    async inspectOrphanPages() {
      const pages = await listPages()
      const topics = await topicIndex.list()
      const topicLinkedPageIds = new Set(topics.flatMap((item) => item.memoryPageIds ?? []))

      const items = pages
        .filter((page) => {
          if (page.status === 'archived') return false
          const hasTopicLink = topicLinkedPageIds.has(page.pageId)
          const hasSources = Array.isArray(page.sourceRefs) && page.sourceRefs.length > 0
          const hasRelated = Array.isArray(page.relatedPageIds) && page.relatedPageIds.length > 0
          return !hasTopicLink && !hasSources && !hasRelated
        })
        .map((page) => ({
          pageId: page.pageId,
          title: page.title,
          pageType: page.pageType,
          suggestion: buildRepairSuggestion(
            'review_or_archive_page',
            { pageId: page.pageId },
            '页面没有索引、没有来源、没有关联，建议补链、合并或归档'
          )
        }))

      return {
        orphanCount: items.length,
        items
      }
    }
  }
}
