import { assert, createServiceHarness } from '../tests/shared/service-harness.mjs'
import { listTools } from '../electron/backend/tools/registry.js'
import { evaluateToolCalls } from '../electron/backend/policy/toolPolicy.js'
import { buildConversationContext } from '../electron/backend/agent/contextBuilder.js'
import { createConversationOrchestrator } from '../electron/backend/agent/orchestrator.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { saveMessage } from '../electron/db.js'

async function run() {
  const harness = await createServiceHarness('task406-legacy-memory-primary-chain-retirement')

  try {
    const runtimeToolNames = listTools().map((item) => item.name)
    assert(
      !runtimeToolNames.some((name) => name.startsWith('memory.')),
      '主运行时不应注册 legacy memory 工具',
      runtimeToolNames
    )

    const denyDecision = evaluateToolCalls(
      [
        {
          tool_name: 'memory.create',
          arguments: {
            kind: 'profile',
            title: '旧链路测试',
            content: '这是一条 legacy memory 写入尝试'
          }
        }
      ],
      {
        sourceText: '请帮我写入长期记忆',
        store: harness.store
      }
    )
    assert(denyDecision.decision === 'deny', 'legacy memory 工具在策略层应被 deny', denyDecision)
    assert(
      String(denyDecision.reason ?? '').includes('Memory Wiki'),
      'legacy memory deny reason 应明确引导到 Memory Wiki',
      denyDecision
    )

    saveMessage(harness.store, {
      id: 'msg-406-1',
      date: '2026-06-30',
      role: 'user',
      content: '我叫叶健钦，你是我的小铃湾。'
    })
    saveMessage(harness.store, {
      id: 'msg-406-2',
      date: '2026-06-30',
      role: 'cornie',
      content: '记住啦，主人。'
    })

    const context = await buildConversationContext(harness.store, {
      date: '2026-06-30',
      baseDir: harness.baseDir
    })

    assert(
      typeof context.memorySummary === 'string' && context.memorySummary.length > 0,
      '主链上下文应提供来自 wiki 的长期记忆摘要',
      context
    )
    assert(
      !String(context.memorySummary).includes('memory_entries'),
      '主链长期记忆摘要不应暴露 legacy memory_entries 痕迹',
      context.memorySummary
    )

    const wikiService = await createMemoryWikiService({
      baseDir: harness.baseDir,
      store: harness.store
    })
    const pagesBefore = (await wikiService.listSummaries()).length

    const orchestrator = createConversationOrchestrator(harness.store, {
      baseDir: harness.baseDir
    })

    // 444 后主链记忆写入完全由 LLM 提炼轮次驱动：mock DeepSeek 让提炼轮次落库到 Memory Wiki。
    const previousApiKey = process.env.DEEPSEEK_API_KEY
    process.env.DEEPSEEK_API_KEY = 'verify-task406-test-key'
    const originalFetch = global.fetch
    global.fetch = async (_url, options = {}) => {
      const payload = JSON.parse(String(options?.body ?? '{}'))
      const prompt = String(payload?.messages?.[0]?.content ?? '')
      if (prompt.includes('memory distillation')) {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      observations: [],
                      identity_updates: [
                        {
                          entity: 'profile',
                          action: 'create',
                          fields: { userName: '叶健钦', cornieRelationship: '用户是 Cornie 的爸爸和创造者' }
                        }
                      ],
                      memory_wiki_requests: [],
                      reasoning: 'task406'
                    })
                  }
                }
              ]
            }
          },
          async text() {
            return ''
          }
        }
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return { choices: [{ message: { content: '{"type":"reply","assistant_reply":"好的主人。"}' } }] }
        },
        async text() {
          return ''
        }
      }
    }
    try {
      await orchestrator.runTurn({
        date: '2026-06-30',
        message: '我叫叶健钦，你是我的爸爸和创造者。'
      })
    } finally {
      global.fetch = originalFetch
      if (previousApiKey === undefined) {
        delete process.env.DEEPSEEK_API_KEY
      } else {
        process.env.DEEPSEEK_API_KEY = previousApiKey
      }
    }

    const pagesAfter = (await wikiService.listSummaries()).length
    const profileSummaries = await wikiService.listSummaries({
      pageType: 'identity_profile'
    })
    const profilePage = profileSummaries[0]
      ? await wikiService.get(profileSummaries[0].pageId)
      : null

    assert(
      pagesAfter >= pagesBefore,
      '对话主链后的长期记忆沉淀应进入 Memory Wiki',
      {
        before: pagesBefore,
        after: pagesAfter
      }
    )
    assert(profilePage, 'identity_profile 应作为正式长期记忆主源存在')
    assert(
      String(profilePage?.content ?? '').includes('叶健钦') ||
        String(profilePage?.summary ?? '').includes('叶健钦'),
      'identity_profile 应沉淀用户名字等跨天身份信息',
      profilePage
    )

    console.log('verify-task406-legacy-memory-primary-chain-retirement: ok')
  } finally {
    await harness.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
