import { createServiceHarness, assert } from '../tests/shared/service-harness.mjs'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { createConversationOrchestrator } from '../electron/backend/agent/orchestrator.js'
import { buildConversationPrompt, buildMemoryDistillationPrompt } from '../electron/backend/agent/promptBuilder.js'

async function run() {
  const harness = await createServiceHarness('task453-associative-interstitial')
  const memoryWiki = await createMemoryWikiService({
    baseDir: harness.baseDir,
    store: harness.store
  })

  try {
    // 1) 对话 prompt 含联想规则，且无流程播报示例文案
    const conversationPrompt = buildConversationPrompt({
      context: { date: '2026-08-21', recentConversationSummary: 'x', categorySummary: 'x', todoSummary: 'x', scheduleSummary: 'x', observationSummary: 'x', memorySummary: 'x', topicSummary: 'x', chatRecallSummary: 'x', observationRecallSummary: 'x', toolSummary: 'x' }
    })
    assert(conversationPrompt.includes('联想必须能溯源到你本轮已经看到的内容'), '对话 prompt 应含联想溯源护栏')
    assert(conversationPrompt.includes('不要用"让我找找"'), '对话 prompt 应禁止流程播报')
    assert(!conversationPrompt.includes('让我找找"请主人稍等'), '对话 prompt 不应把流程播报当示例')

    // 2) 提炼 prompt 含确认/纠正高置信度规则
    const distillationPrompt = buildMemoryDistillationPrompt({ date: '2026-08-21', recentMessages: [], todayObservations: [], memorySummaryLines: [] })
    assert(distillationPrompt.includes('确认/纠正'), '提炼 prompt 应含确认/纠正信号规则')
    assert(distillationPrompt.includes('最高置信度'), '确认/纠正应标注最高置信度')

    // 3) mock 钻取轮：联想话语进入 interimReplies
    const drillTarget = await memoryWiki.create({ pageType: 'event', title: '钟奕菲', summary: '高中同桌' })

    const previousApiKey = process.env.DEEPSEEK_API_KEY
    process.env.DEEPSEEK_API_KEY = 'verify-453-key'
    const originalFetch = global.fetch
    const drillEnvelope = JSON.stringify({
      type: 'tool_call',
      assistant_reply: '哦对……她是你高中同桌，你总说她笑起来眼睛弯弯的。',
      tool_calls: [{ tool_name: 'memory_wiki.get_page', arguments: { pageId: drillTarget.pageId } }]
    })
    const replyEnvelope = JSON.stringify({ type: 'reply', assistant_reply: '想起她，真好。' })
    let callCount = 0
    global.fetch = async (_url, options = {}) => {
      const payload = JSON.parse(String(options?.body ?? '{}'))
      const prompt = String(payload?.messages?.[0]?.content ?? '')
      if (prompt.includes('memory distillation')) {
        return {
          ok: true, status: 200,
          async json() { return { choices: [{ message: { content: JSON.stringify({ observations: [], identity_updates: [], memory_wiki_requests: [], reasoning: '' }) } }] } },
          async text() { return '' }
        }
      }
      callCount += 1
      return {
        ok: true, status: 200,
        async json() { return { choices: [{ message: { content: callCount <= 1 ? drillEnvelope : replyEnvelope } }] } },
        async text() { return '' }
      }
    }

    try {
      const orchestrator = createConversationOrchestrator(harness.store, { baseDir: harness.baseDir })
      const result = await orchestrator.runTurn({ date: '2026-08-21', message: '还记得钟奕菲吗' })
      assert(
        Array.isArray(result.interimReplies) && result.interimReplies.includes('哦对……她是你高中同桌，你总说她笑起来眼睛弯弯的。'),
        '联想话语应进入 interimReplies',
        result.interimReplies
      )
      assert(String(result.cornieMessage?.content ?? '').includes('想起她'), '最终回复应正常接续', result.cornieMessage?.content)
    } finally {
      global.fetch = originalFetch
      if (previousApiKey === undefined) {
        delete process.env.DEEPSEEK_API_KEY
      } else {
        process.env.DEEPSEEK_API_KEY = previousApiKey
      }
    }

    console.log('verify-task453-associative-interstitial: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
