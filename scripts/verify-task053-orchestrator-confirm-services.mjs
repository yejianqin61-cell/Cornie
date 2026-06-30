import fs from 'node:fs'
import { randomUUID } from 'node:crypto'

import { openDb } from '../electron/db.js'
import { createLedgerService } from '../electron/backend/ledger/service.js'
import { createTodoService } from '../electron/backend/todo/service.js'
import { createScheduleService } from '../electron/backend/schedule/service.js'
import { createConfirmService } from '../electron/backend/confirm/service.js'
import { createConversationOrchestrator } from '../electron/backend/agent/orchestrator.js'
import { registerLedgerTools } from '../electron/backend/ledger/tools.js'
import { registerTodoTools } from '../electron/backend/todo/tools.js'
import { registerScheduleTools } from '../electron/backend/schedule/tools.js'
import { registerObservationTools } from '../electron/backend/observation/tools.js'
import { registerSystemTools } from '../electron/backend/system/tools.js'
import { registerTool } from '../electron/backend/tools/registry.js'
import { cleanupSqliteFile, createRuntimeSqlitePath } from './tmp-artifacts.mjs'

function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

async function createStore(caseName) {
  const dbPath = await createRuntimeSqlitePath(`task053-${caseName}-${randomUUID()}`)
  cleanupSqliteFile(dbPath)
  const store = await openDb(dbPath)

  registerLedgerTools(store, { registerTool })
  registerTodoTools(store, { registerTool })
  registerScheduleTools(store, { registerTool })
  registerObservationTools(store, { registerTool })
  registerSystemTools(store, { registerTool })

  return {
    store,
    dbPath,
    close() {
      try {
        store.close()
      } catch {}
      cleanupSqliteFile(dbPath)
    }
  }
}

async function withMockedFetch(handler, run) {
  const originalFetch = global.fetch
  global.fetch = handler
  try {
    return await run()
  } finally {
    global.fetch = originalFetch
  }
}

function buildMockFetch(resolver) {
  return async (_url, options = {}) => {
    const payload = JSON.parse(String(options.body ?? '{}'))
    const content = await resolver(payload)
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          choices: [
            {
              message: {
                content
              }
            }
          ]
        }
      },
      async text() {
        return content
      }
    }
  }
}

async function testLedgerServiceCrud() {
  const harness = await createStore('ledger-service')
  try {
    const ledger = createLedgerService(harness.store)
    const created = ledger.addExpense({
      amount: 66,
      categoryId: 'exp_food',
      categoryName: '餐饮',
      item: '晚饭',
      sourceText: '晚饭花了66块',
      occurredAt: '2026-06-27T12:00:00.000Z'
    })

    const loaded = ledger.getEntry(created.id)
    assert(loaded?.amount === 66, 'expected ledger entry amount', loaded)

    const updated = ledger.updateEntry({
      id: created.id,
      amount: 88,
      item: '火锅',
      categoryId: 'exp_food',
      categoryName: '餐饮'
    })
    assert(updated.amount === 88, 'expected updated ledger amount', updated)
    assert(updated.item === '火锅', 'expected updated ledger item', updated)

    const todayList = ledger.listToday({ date: '2026-06-27' })
    assert(todayList.some((item) => item.id === created.id), 'expected ledger listToday include entry', todayList)

    const deleted = ledger.deleteEntry({ id: created.id })
    assert(deleted.id === created.id, 'expected deleted entry returned', deleted)
    assert(ledger.getEntry(created.id) == null, 'expected entry removed after delete')
  } finally {
    harness.close()
  }
}

async function testTodoServiceCrud() {
  const harness = await createStore('todo-service')
  try {
    const todo = createTodoService(harness.store)
    const created = todo.create({
      title: '复习英语',
      categoryId: 'todo_study',
      categoryName: '学习',
      sourceText: '今晚复习英语'
    })

    assert(created.status === 'pending', 'expected pending todo', created)

    const updated = todo.update({
      id: created.id,
      description: '先做阅读再做听力'
    })
    assert(updated.description === '先做阅读再做听力', 'expected todo description updated', updated)

    const completed = todo.complete({ id: created.id })
    assert(completed.status === 'done', 'expected todo completed', completed)

    const cancelled = todo.delete({ id: created.id })
    assert(cancelled.status === 'cancelled', 'expected todo cancelled by delete', cancelled)
  } finally {
    harness.close()
  }
}

async function testScheduleServiceCrud() {
  const harness = await createStore('schedule-service')
  try {
    const schedule = createScheduleService(harness.store)
    const created = schedule.create({
      title: '带猫复查',
      startAt: '2026-07-01T10:00:00.000Z',
      location: '宠物医院',
      categoryId: 'schedule_reminder',
      categoryName: '提醒',
      sourceText: '下周带猫复查'
    })

    assert(created.status === 'scheduled', 'expected scheduled entry', created)

    const updated = schedule.update({
      id: created.id,
      endAt: '2026-07-01T11:00:00.000Z'
    })
    assert(updated.endAt === '2026-07-01T11:00:00.000Z', 'expected endAt updated', updated)

    const cancelled = schedule.cancel({ id: created.id })
    assert(cancelled.status === 'cancelled', 'expected schedule cancelled', cancelled)

    const removable = schedule.create({
      title: '产品评审',
      startAt: '2026-07-02T15:00:00.000Z',
      categoryId: 'schedule_meeting',
      categoryName: '会议'
    })
    const deleted = schedule.delete({ id: removable.id })
    assert(deleted.id === removable.id, 'expected delete return removed entry', deleted)
    assert(schedule.get(removable.id) == null, 'expected deleted schedule removed')
  } finally {
    harness.close()
  }
}

async function testConfirmApproveAndExecute() {
  const harness = await createStore('confirm-approve')
  try {
    process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'verify-key'
    process.env.DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://verify.local'
    process.env.DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

    const confirm = createConfirmService(harness.store)
    const pending = confirm.createPending({
      date: '2026-06-27',
      conversationMessageId: 'msg-confirm-approve',
      sourceText: '记一笔午饭66块',
      assistantReply: '小铃湾先帮主人执行这次操作。',
      toolCalls: [
        {
          tool_name: 'ledger.add_expense',
          arguments: {
            amount: 66,
            categoryId: 'exp_food',
            categoryName: '餐饮',
            item: '午饭',
            sourceText: '记一笔午饭66块',
            occurredAt: '2026-06-27T12:00:00.000Z'
          }
        }
      ],
      confirmRequest: {
        kind: 'tool_confirmation',
        toolName: 'ledger.add_expense',
        reason: '需要确认后执行'
      }
    })

    confirm.approve(pending.id)

    const result = await withMockedFetch(
      buildMockFetch(async () =>
        JSON.stringify({
          type: 'reply',
          assistant_reply: '小铃湾已经记好了。'
        })
      ),
      () => confirm.executeApprovedConfirmation(pending.id)
    )

    assert(result.confirmation.status === 'executed', 'expected confirmation executed', result)
    assert(result.toolExecution.used === true, 'expected tool execution used', result)
    assert(
      result.toolExecution.results.some((item) => item.tool_name === 'ledger.add_expense' && item.ok),
      'expected ledger.add_expense executed',
      result
    )
  } finally {
    harness.close()
  }
}

async function testConfirmReject() {
  const harness = await createStore('confirm-reject')
  try {
    const confirm = createConfirmService(harness.store)
    const pending = confirm.createPending({
      date: '2026-06-27',
      conversationMessageId: 'msg-confirm-reject',
      sourceText: '把这笔账删掉',
      assistantReply: '小铃湾想先征得主人同意。',
      toolCalls: [
        {
          tool_name: 'ledger.delete_entry',
          arguments: {
            id: 'ledger-entry-to-delete'
          }
        }
      ],
      confirmRequest: {
        kind: 'tool_confirmation',
        toolName: 'ledger.delete_entry',
        reason: '删除记账需要确认'
      }
    })

    const rejected = confirm.rejectConfirmation(pending.id)
    assert(rejected.confirmation.status === 'rejected', 'expected rejected confirmation', rejected)
    assert(
      String(rejected.cornieMessage?.content ?? '').includes('先不动手'),
      'expected reject reply mention no action',
      rejected
    )
  } finally {
    harness.close()
  }
}

async function testOrchestratorReplyPath() {
  const harness = await createStore('orchestrator-reply')
  try {
    process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'verify-key'
    process.env.DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://verify.local'
    process.env.DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

    const orchestrator = createConversationOrchestrator(harness.store)

    const result = await withMockedFetch(
      buildMockFetch(async () =>
        JSON.stringify({
          type: 'reply',
          assistant_reply: '小铃湾在呢。'
        })
      ),
      () =>
        orchestrator.runTurn({
          date: '2026-06-27',
          message: '你好呀'
        })
    )

    assert(result.cornieMessage.content === '小铃湾在呢。', 'expected direct reply content', result)
    assert(result.toolExecution.used === false, 'expected no tool execution', result)
    assert(result.policyDecision.decision === 'allow', 'expected allow default decision', result)
  } finally {
    harness.close()
  }
}

async function testOrchestratorAskBackPath() {
  const harness = await createStore('orchestrator-ask-back')
  try {
    process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'verify-key'
    process.env.DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://verify.local'
    process.env.DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

    const orchestrator = createConversationOrchestrator(harness.store)

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
        orchestrator.runTurn({
          date: '2026-06-27',
          message: '今天午饭记一下'
        })
    )

    assert(result.policyDecision.decision === 'ask_back', 'expected ask_back decision', result)
    assert(
      String(result.cornieMessage.content).includes('金额'),
      'expected ask_back reply mention amount',
      result
    )
  } finally {
    harness.close()
  }
}

async function testOrchestratorConfirmPath() {
  const harness = await createStore('orchestrator-confirm')
  try {
    process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'verify-key'
    process.env.DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://verify.local'
    process.env.DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

    const orchestrator = createConversationOrchestrator(harness.store)

    const result = await withMockedFetch(
      buildMockFetch(async () =>
        JSON.stringify({
          type: 'tool_call',
          assistant_reply: '我先帮主人确认要不要删掉这笔账。',
          tool_calls: [
            {
              tool_name: 'ledger.delete_entry',
              arguments: {
                id: 'ledger-entry-to-delete'
              }
            }
          ]
        })
      ),
      () =>
        orchestrator.runTurn({
          date: '2026-06-27',
          message: '把那笔账删掉'
        })
    )

    assert(result.policyDecision.decision === 'confirm', 'expected confirm decision', result)
    assert(result.pendingConfirmation?.status === 'pending', 'expected pending confirmation created', result)
  } finally {
    harness.close()
  }
}

async function testOrchestratorToolExecutionPath() {
  const harness = await createStore('orchestrator-tool')
  try {
    process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'verify-key'
    process.env.DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://verify.local'
    process.env.DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

    const orchestrator = createConversationOrchestrator(harness.store)

    const fetchMock = buildMockFetch(async (payload) => {
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
    })

    const result = await withMockedFetch(fetchMock, () =>
      orchestrator.runTurn({
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
    assert(
      result.cornieMessage.content === '小铃湾已经帮主人记好这笔账啦。',
      'expected final followup reply',
      result
    )
  } finally {
    harness.close()
  }
}

const tests = [
  ['ledger service crud', testLedgerServiceCrud],
  ['todo service crud', testTodoServiceCrud],
  ['schedule service crud', testScheduleServiceCrud],
  ['confirm approve and execute', testConfirmApproveAndExecute],
  ['confirm reject', testConfirmReject],
  ['orchestrator direct reply path', testOrchestratorReplyPath],
  ['orchestrator ask_back path', testOrchestratorAskBackPath],
  ['orchestrator confirm path', testOrchestratorConfirmPath],
  ['orchestrator tool execution path', testOrchestratorToolExecutionPath]
]

async function main() {
  let passed = 0

  for (const [name, test] of tests) {
    await test()
    passed += 1
    console.log(`PASS task053 - ${name}`)
  }

  console.log(`verify-task053-orchestrator-confirm-services: passed ${passed}/${tests.length}`)
}

main().catch((error) => {
  console.error('verify-task053-orchestrator-confirm-services: failed')
  console.error(error?.message ?? error)
  if (error?.details !== undefined) {
    console.error(JSON.stringify(error.details, null, 2))
  }
  process.exit(1)
})
