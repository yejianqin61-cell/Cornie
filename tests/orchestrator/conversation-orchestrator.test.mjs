import { createConversationOrchestrator, whenMemoryDistillationIdle } from '../../electron/backend/agent/orchestrator.js'
import { getMessagesByDate } from '../../electron/db.js'
import { createMemoryWikiAuditStore } from '../../electron/backend/memory-wiki/index.js'
import { createObservationService } from '../../electron/backend/observation/service.js'
import { createLedgerService } from '../../electron/backend/ledger/service.js'
import { createTodoService } from '../../electron/backend/todo/service.js'
import {
  assert,
  buildMockFetch,
  createOrchestratorHarness,
  withMockedFetch
} from '../shared/orchestrator-harness.mjs'

async function testDirectReplyPath() {
  const harness = await createOrchestratorHarness('orchestrator-reply')
  try {
    const result = await withMockedFetch(
      buildMockFetch(async () =>
        JSON.stringify({
          type: 'reply',
          assistant_reply: '小铃湾在呢。'
        })
      ),
      () =>
        harness.orchestrator.runTurn({
          date: '2026-06-27',
          message: '你好吗'
        })
    )

    assert(result.cornieMessage.content === '小铃湾在呢。', 'expected direct reply content', result)
    assert(result.toolExecution.used === false, 'expected no tool execution', result)
    assert(result.policyDecision.decision === 'allow', 'expected allow decision', result)
  } finally {
    await harness.close()
  }
}

async function testAskBackPath() {
  const harness = await createOrchestratorHarness('orchestrator-ask-back')
  try {
    const result = await withMockedFetch(
      buildMockFetch(async () =>
        JSON.stringify({
          type: 'tool_call',
          assistant_reply: '我先帮主人记一下。',
          tool_calls: [
            {
              tool_name: 'ledger.add_expense',
              arguments: {
                categoryName: '餐饮',
                sourceText: '今天午饭记一下'
              }
            }
          ]
        })
      ),
      () =>
        harness.orchestrator.runTurn({
          date: '2026-06-27',
          message: '今天午饭记一下'
        })
    )

    assert(result.policyDecision.decision === 'ask_back', 'expected ask_back decision', result)
    assert(String(result.cornieMessage.content).includes('金额'), 'expected ask_back mention amount', result)
  } finally {
    await harness.close()
  }
}

async function testConfirmPath() {
  const harness = await createOrchestratorHarness('orchestrator-confirm')
  try {
    const result = await withMockedFetch(
      buildMockFetch(async () =>
        JSON.stringify({
          type: 'tool_call',
          assistant_reply: '我想把这个偏好写进长期记忆。',
          tool_calls: [
            {
              tool_name: 'memory_wiki.create_page',
              arguments: {
                pageType: 'preference',
                title: '喜欢猫咪',
                summary: '主人喜欢猫咪',
                body: '主人喜欢猫咪。'
              }
            }
          ]
        })
      ),
      () =>
        harness.orchestrator.runTurn({
          date: '2026-06-27',
          message: '我很喜欢猫咪'
        })
    )

    assert(result.policyDecision.decision === 'confirm', 'expected confirm decision', result)
    assert(result.pendingConfirmation?.status === 'pending', 'expected pending confirmation created', result)
  } finally {
    await harness.close()
  }
}

async function testToolExecutionFollowupPath() {
  const harness = await createOrchestratorHarness('orchestrator-tool-followup')
  try {
    const result = await withMockedFetch(
      buildMockFetch(async (payload) => {
        const messages = Array.isArray(payload.messages) ? payload.messages : []
        const lastUserContent = String(messages[messages.length - 1]?.content ?? '')

        if (lastUserContent.includes('请结合工具执行结果')) {
          return JSON.stringify({
            type: 'reply',
            assistant_reply: '小铃湾已经帮主人记好这笔账啦。'
          })
        }

        return JSON.stringify({
          type: 'tool_call',
          assistant_reply: '我先帮主人记账。',
          tool_calls: [
            {
              tool_name: 'ledger.add_expense',
              arguments: {
                amount: 66,
                categoryId: 'exp_food',
                categoryName: '餐饮',
                item: '午饭',
                sourceText: '今天午饭66块'
              }
            }
          ]
        })
      }),
      () =>
        harness.orchestrator.runTurn({
          date: '2026-06-27',
          message: '今天午饭66块'
        })
    )

    assert(result.toolExecution.used === true, 'expected tool execution used', result)
    assert(
      result.toolExecution.results.some((item) => item.tool_name === 'ledger.add_expense' && item.ok),
      'expected ledger.add_expense execution success',
      result
    )
    assert(result.cornieMessage.content === '小铃湾已经帮主人记好这笔账啦。', 'expected followup reply', result)
  } finally {
    await harness.close()
  }
}

async function testReadOnlyLookupRoundPath() {
  const harness = await createOrchestratorHarness('orchestrator-readonly-lookup')
  try {
    const todo = createTodoService(harness.store)
    todo.create({
      title: '复习英语',
      categoryId: 'todo_study',
      categoryName: '学习',
      sourceText: '今晚复习英语'
    })

    const result = await withMockedFetch(
      buildMockFetch(async (payload) => {
        const messages = Array.isArray(payload.messages) ? payload.messages : []
        const lastUserContent = String(messages[messages.length - 1]?.content ?? '')

        if (lastUserContent.includes('只读补查摘要')) {
          return JSON.stringify({
            type: 'reply',
            assistant_reply: '小铃湾看到今天还躺着一条“复习英语”的待办喔。'
          })
        }

        return JSON.stringify({
          type: 'tool_call',
          assistant_reply: '我先查一下今天的待办。',
          tool_calls: [
            {
              tool_name: 'todo.list_today',
              arguments: {}
            }
          ]
        })
      }),
      () =>
        harness.orchestrator.runTurn({
          date: '2026-06-27',
          message: '我今天还有什么待办'
        })
    )

    assert(result.toolExecution.used === true, 'expected lookup tool execution used', result)
    assert(
      result.toolExecution.results.some((item) => item.tool_name === 'todo.list_today' && item.ok),
      'expected todo.list_today lookup success',
      result
    )
    assert(String(result.cornieMessage.content).includes('复习英语'), 'expected lookup-based reply mention todo', result)
  } finally {
    await harness.close()
  }
}

async function testDirtyJsonRepairPath() {
  const harness = await createOrchestratorHarness('orchestrator-dirty-json')
  try {
    let callCount = 0
    const result = await withMockedFetch(
      buildMockFetch(async (payload) => {
        const prompt = String(payload?.messages?.[0]?.content ?? '')
        // 443：记忆提炼轮是独立调用，返回空决策，不计入对话协议调用数。
        if (prompt.includes('memory distillation')) {
          return JSON.stringify({ observations: [], identity_updates: [], memory_wiki_requests: [], reasoning: '' })
        }
        callCount += 1
        if (callCount === 1) {
          return '当然可以呀\n```json\n{"type":"reply","assistant_reply":"小铃湾在呢。"}\n```'
        }
        return JSON.stringify({
          type: 'reply',
          assistant_reply: '小铃湾在呢。'
        })
      }),
      () =>
        harness.orchestrator.runTurn({
          date: '2026-06-27',
          message: '你在吗'
        })
    )

    assert(callCount === 1, 'expected code-block json to parse without repair retry', { callCount, result })
    assert(result.cornieMessage.content === '小铃湾在呢。', 'expected repaired/parsible reply content', result)
  } finally {
    await harness.close()
  }
}

async function testInvalidJsonRepairRetryPath() {
  const harness = await createOrchestratorHarness('orchestrator-repair-retry')
  try {
    let callCount = 0
    const result = await withMockedFetch(
      buildMockFetch(async (payload) => {
        const prompt = String(payload?.messages?.[0]?.content ?? '')
        if (prompt.includes('memory distillation')) {
          return JSON.stringify({ observations: [], identity_updates: [], memory_wiki_requests: [], reasoning: '' })
        }
        callCount += 1
        if (callCount === 1) {
          return '这不是合法 json'
        }
        return JSON.stringify({
          type: 'reply',
          assistant_reply: '小铃湾这次说清楚啦。'
        })
      }),
      () =>
        harness.orchestrator.runTurn({
          date: '2026-06-27',
          message: '再说一遍'
        })
    )

    assert(callCount === 2, 'expected invalid json trigger one repair retry', { callCount, result })
    assert(result.cornieMessage.content === '小铃湾这次说清楚啦。', 'expected repaired retry reply', result)
  } finally {
    await harness.close()
  }
}

const REPLY_ENVELOPE = JSON.stringify({ type: 'reply', assistant_reply: '好的主人。' })

function isDistillationRequest(payload) {
  return String(payload?.messages?.[0]?.content ?? '').includes('记忆提炼官')
}

function createGatedFetch(distillationContent) {
  let release = () => {}
  const gate = new Promise((resolve) => {
    release = resolve
  })
  return {
    release: () => release(),
    fetch: buildMockFetch(async (payload) => {
      if (!isDistillationRequest(payload)) return REPLY_ENVELOPE
      await gate
      if (distillationContent instanceof Error) throw distillationContent
      return distillationContent
    })
  }
}

function createIsolatedOrchestrator(harness) {
  return createConversationOrchestrator(harness.store, { baseDir: harness.baseDir })
}

async function testReplyDoesNotWaitForDistillation() {
  const harness = await createOrchestratorHarness('orchestrator-background-distillation')
  try {
    const observation = JSON.stringify({
      observations: [{ action: 'create', type: 'event', title: '后台观察', content: '提炼在回复之后完成。' }],
      identity_updates: [],
      memory_wiki_requests: [],
      reasoning: ''
    })
    const gated = createGatedFetch(observation)
    const orchestrator = createIsolatedOrchestrator(harness)
    await withMockedFetch(gated.fetch, async () => {
      const outcome = await Promise.race([
        orchestrator.runTurn({ date: '2026-06-27', message: '今天做了点事' }),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), 2000))
      ])
      assert(outcome !== 'timeout', 'expected runTurn to return while distillation is still blocked')
      const messages = getMessagesByDate(harness.store, '2026-06-27')
      assert(
        messages.some((item) => item.role === 'user') && messages.some((item) => item.role === 'cornie'),
        'expected both messages saved before distillation finished',
        messages
      )
      assert(
        createObservationService(harness.store).listByDate('2026-06-27').length === 0,
        'expected no observation before the gate opens'
      )

      gated.release()
      await whenMemoryDistillationIdle()
      const observations = createObservationService(harness.store).listByDate('2026-06-27')
      assert(observations.some((item) => item.title === '后台观察'), 'expected the background observation', observations)
    })
  } finally {
    await harness.close()
  }
}

async function testDistillationFailureDoesNotAffectReply() {
  const harness = await createOrchestratorHarness('orchestrator-background-distillation-failure')
  try {
    const gated = createGatedFetch(new Error('distillation network down'))
    const orchestrator = createIsolatedOrchestrator(harness)
    await withMockedFetch(gated.fetch, async () => {
      const result = await orchestrator.runTurn({ date: '2026-06-27', message: '你好' })
      assert(result.cornieMessage.content === '好的主人。', 'expected the reply to be unaffected', result)
      gated.release()
      await whenMemoryDistillationIdle()
      const events = await (await createMemoryWikiAuditStore(harness.baseDir)).list({ limit: 10 })
      assert(
        events.some((item) => item.eventType === 'memory_distillation' && item.details?.source === 'unavailable'),
        'expected an unavailable distillation audit event',
        events
      )
    })
  } finally {
    await harness.close()
  }
}

const tests = [
  ['direct reply path', testDirectReplyPath],
  ['ask_back path', testAskBackPath],
  ['confirm path', testConfirmPath],
  ['tool execution followup path', testToolExecutionFollowupPath],
  ['read only lookup round path', testReadOnlyLookupRoundPath],
  ['dirty json parse path', testDirtyJsonRepairPath],
  ['invalid json repair retry path', testInvalidJsonRepairRetryPath],
  ['reply does not wait for distillation', testReplyDoesNotWaitForDistillation],
  ['distillation failure does not affect reply', testDistillationFailureDoesNotAffectReply]
]

let passed = 0

for (const [name, test] of tests) {
  await test()
  passed += 1
  console.log(`PASS orchestrator - ${name}`)
}

console.log(`tests/orchestrator/conversation-orchestrator.test.mjs: passed ${passed}/${tests.length}`)
