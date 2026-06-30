import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { saveMessage } from '../electron/db.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { createObservationService } from '../electron/backend/observation/service.js'
import { clearTools, getTool, registerTool } from '../electron/backend/tools/registry.js'
import { registerMemoryWikiTools } from '../electron/backend/memory-wiki/tools.js'

async function run() {
  const harness = await createServiceHarness('task395-memory-source-trace-tools')
  const { baseDir, store } = harness

  try {
    clearTools()

    const memoryWiki = await createMemoryWikiService({ baseDir, store })
    const observationService = createObservationService(store)

    saveMessage(store, {
      id: 'chat-1',
      date: '2026-06-30',
      role: 'user',
      content: '钟奕菲对我来说真的很重要。'
    })

    const observation = observationService.recordConversationTurn({
      date: '2026-06-30',
      userMessage: '钟奕菲对我来说真的很重要。',
      cornieMessage: '小铃湾会认真记住这份重要。'
    })

    const personPage = await memoryWiki.create({
      pageType: 'identity_person',
      title: '钟奕菲',
      personName: '钟奕菲',
      relationshipToUser: '初恋',
      roleSummary: '用户人生中的重要人物',
      personalitySummary: '温柔，害羞，内向',
      meaningToUser: '对用户仍然具有明显情感重量',
      sharedExperienceSummary: '2021 年冬天相恋，2022 年春天疏远，2022 年夏天决裂',
      timelineSummary: '2021 冬相恋；2022 春疏远；2022 夏决裂',
      emotionalWeight: 'high',
      firstKnownPeriod: '2021 冬天',
      sourceRefs: [
        {
          kind: 'chat',
          date: '2026-06-30',
          messageId: 'chat-1'
        },
        {
          kind: 'observation',
          observationId: observation.id
        }
      ]
    })

    await memoryWiki.linkPageToTopic({
      pageId: personPage.pageId,
      keyword: '钟奕菲',
      importance: 'high',
      aliases: ['奕菲']
    })

    await registerMemoryWikiTools({ baseDir, store }, { registerTool })

    const pageTraceTool = getTool('memory_wiki.get_page_source_trace')
    const topicTraceTool = getTool('memory_index.get_source_trace')

    assert(Boolean(pageTraceTool), '应注册 memory_wiki.get_page_source_trace')
    assert(Boolean(topicTraceTool), '应注册 memory_index.get_source_trace')

    const pageTrace = await pageTraceTool.handler({ pageId: personPage.pageId })
    assert(pageTrace.ok === true, '页面来源追溯工具应返回 ok')
    assert(Array.isArray(pageTrace.result.chatSources), '页面来源追溯应返回 chatSources')
    assert(Array.isArray(pageTrace.result.observationSources), '页面来源追溯应返回 observationSources')
    assert(pageTrace.result.chatSources.some((item) => item.messageId === 'chat-1' && item.exists), '页面来源追溯应命中聊天来源')
    assert(pageTrace.result.observationSources.some((item) => item.observationId === observation.id && item.exists), '页面来源追溯应命中观察来源')

    const topicTrace = await topicTraceTool.handler({ normalizedKey: '钟奕菲' })
    assert(topicTrace.ok === true, '主题来源追溯工具应返回 ok')
    assert(Array.isArray(topicTrace.result.chatSources), '主题来源追溯应返回 chatSources')
    assert(Array.isArray(topicTrace.result.observationSources), '主题来源追溯应返回 observationSources')
    assert(Boolean(topicTrace.result.topicTimelineTrace), '主题来源追溯应返回 topicTimelineTrace')
    assert(topicTrace.result.relatedPages.some((item) => item.pageId === personPage.pageId), '主题来源追溯应返回关联记忆页')

    console.log('verify-task395-memory-source-trace-tools: ok')
  } finally {
    clearTools()
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
