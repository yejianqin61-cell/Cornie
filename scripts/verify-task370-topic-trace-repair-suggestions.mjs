import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { createTopicIndexStore } from '../electron/backend/memory-wiki/topicIndex.js'

async function run() {
  const harness = await createServiceHarness('task370-topic-trace-repair-suggestions')
  const baseDir = harness.baseDir
  const store = harness.store

  try {
    const memoryWiki = await createMemoryWikiService({ baseDir, store })
    const topicIndex = await createTopicIndexStore(baseDir)

    await topicIndex.upsert({
      keyword: '钟奕菲',
      normalizedKey: '钟奕菲',
      aliases: ['奕菲'],
      dates: ['2026-06-30', '2026-07-02'],
      chatRefs: ['2026-06-30#missing-chat-id'],
      observationRefs: ['2026-07-02#missing-observation-id'],
      memoryPageIds: ['identity_person_zhongyifei']
    })

    const result = await memoryWiki.inspectBrokenLinks()
    const missingChatIssue = result.issues.find((item) => item.issueType === 'missing_topic_chat_ref')
    const missingObservationIssue = result.issues.find((item) => item.issueType === 'missing_topic_observation_ref')

    assert(Boolean(missingChatIssue), '应能巡检出缺失的 topic chatRef')
    assert(Boolean(missingObservationIssue), '应能巡检出缺失的 topic observationRef')

    assert(missingChatIssue.keyword === '钟奕菲', 'chatRef issue 应带主题名')
    assert(missingChatIssue.refDate === '2026-06-30', 'chatRef issue 应带 ref 日期')
    assert(missingChatIssue.refId === 'missing-chat-id', 'chatRef issue 应带 ref id')
    assert(missingChatIssue.parsedRef?.messageId === 'missing-chat-id', 'chatRef issue 应带解析结果')
    assert(Array.isArray(missingChatIssue.topicContext?.aliases), 'chatRef issue 应带主题上下文')
    assert(missingChatIssue.suggestion?.target?.parsedRef?.messageId === 'missing-chat-id', 'chatRef 修复建议 payload 应保留机器可执行解析信息')

    assert(missingObservationIssue.keyword === '钟奕菲', 'observationRef issue 应带主题名')
    assert(missingObservationIssue.refDate === '2026-07-02', 'observationRef issue 应带 ref 日期')
    assert(missingObservationIssue.refId === 'missing-observation-id', 'observationRef issue 应带 ref id')
    assert(missingObservationIssue.parsedRef?.observationId === 'missing-observation-id', 'observationRef issue 应带解析结果')
    assert(Array.isArray(missingObservationIssue.topicContext?.memoryPageIds), 'observationRef issue 应带主题关联页面上下文')
    assert(missingObservationIssue.suggestion?.target?.parsedRef?.observationId === 'missing-observation-id', 'observationRef 修复建议 payload 应保留机器可执行解析信息')

    console.log('verify-task370-topic-trace-repair-suggestions: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
