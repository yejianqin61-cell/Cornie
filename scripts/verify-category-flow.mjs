import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  getPendingConfirmation,
  getLedgerEntry,
  listLedgerCategories,
  listPendingConfirmationsByDate,
  getTodoEntry,
  listTodoEntries,
  openDb
} from '../electron/db.js'
import { createConfirmService } from '../electron/backend/confirm/service.js'
import { registerLedgerTools } from '../electron/backend/ledger/tools.js'
import { createLedgerService } from '../electron/backend/ledger/service.js'
import { evaluateToolCalls } from '../electron/backend/policy/toolPolicy.js'
import { registerScheduleTools } from '../electron/backend/schedule/tools.js'
import { createTodoService } from '../electron/backend/todo/service.js'
import { registerTodoTools } from '../electron/backend/todo/tools.js'
import { getTool, registerTool } from '../electron/backend/tools/registry.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const verifyDate = '2026-06-26'

process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'verify-key'
process.env.DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://verify.local'
process.env.DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
process.env.DEEPSEEK_TIMEOUT_MS = process.env.DEEPSEEK_TIMEOUT_MS || '3000'

const originalFetch = global.fetch
global.fetch = async (url, options = {}) => {
  const requestBody = JSON.parse(String(options.body ?? '{}'))
  const messages = Array.isArray(requestBody.messages) ? requestBody.messages : []
  const lastUserMessage = [...messages].reverse().find((item) => item?.role === 'user')
  const content = String(lastUserMessage?.content ?? '')

  let reply = {
    type: 'reply',
    assistant_reply: '小铃湾已经处理好啦。'
  }

  if (content.includes('请根据上面的工具执行结果')) {
    reply = {
      type: 'reply',
      assistant_reply: '小铃湾已经接着完成这次操作啦。'
    }
  } else if (content.includes('你上一条回复不符合约定协议')) {
    reply = {
      type: 'reply',
      assistant_reply: '小铃湾修好协议格式啦。'
    }
  }

  return {
    ok: true,
    status: 200,
    async json() {
      return {
        choices: [
          {
            message: {
              content: JSON.stringify(reply)
            }
          }
        ]
      }
    },
    async text() {
      return JSON.stringify(reply)
    }
  }
}

function cleanupDbFile(dbPath) {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath)
  }
}

function resetRegisteredTools() {
  const toolNames = [
    'ledger.add_expense',
    'ledger.add_income',
    'ledger_category.list_expense',
    'ledger_category.list_income',
    'ledger_category.create_expense',
    'ledger_category.create_income',
    'ledger_category.update',
    'ledger_category.delete',
    'todo.create',
    'todo.update',
    'todo.complete',
    'todo.delete',
    'todo.get',
    'todo.list_today',
    'todo.list_by_range',
    'todo_category.list',
    'todo_category.create',
    'todo_category.update',
    'schedule.create',
    'schedule.update',
    'schedule.cancel',
    'schedule.delete',
    'schedule.get',
    'schedule.list_today',
    'schedule.list_by_range',
    'schedule_category.list',
    'schedule_category.create',
    'schedule_category.update'
  ]

  for (const toolName of toolNames) {
    if (getTool(toolName)) {
      registerTool({
        name: toolName,
        description: `reset ${toolName}`,
        riskLevel: 'low',
        handler: async () => ({
          ok: false,
          error: {
            code: 'tool_reset_placeholder',
            message: 'tool should be re-registered for verification'
          }
        })
      })
    }
  }
}

async function createHarness(caseName) {
  const dbPath = path.join(repoRoot, `tmp-${caseName}.sqlite`)
  cleanupDbFile(dbPath)
  resetRegisteredTools()

  const store = await openDb(dbPath)
  registerLedgerTools(store, { registerTool })
  registerTodoTools(store, { registerTool })
  registerScheduleTools(store, { registerTool })

  const categoryAuditLogs = []
  const originalLog = console.log
  console.log = (...args) => {
    const line = args.map((item) => String(item)).join(' ')
    if (line.startsWith('[category-audit] ')) {
      const payloadText = line.slice('[category-audit] '.length)
      try {
        categoryAuditLogs.push(JSON.parse(payloadText))
      } catch {
        categoryAuditLogs.push({ parseError: payloadText })
      }
    }
    originalLog(...args)
  }

  return {
    store,
    dbPath,
    categoryAuditLogs,
    restore() {
      console.log = originalLog
      try {
        store.close()
      } catch {}
      cleanupDbFile(dbPath)
    }
  }
}

function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

function summarizeError(error) {
  return {
    message: error?.message ?? 'unknown error',
    details: error?.details ?? null,
    stack: error?.stack ?? null
  }
}

async function runCase(name, fn) {
  const startedAt = Date.now()
  try {
    const detail = await fn()
    return {
      name,
      ok: true,
      detail,
      durationMs: Date.now() - startedAt
    }
  } catch (error) {
    return {
      name,
      ok: false,
      error: summarizeError(error),
      durationMs: Date.now() - startedAt
    }
  }
}

async function caseDirectHit() {
  const harness = await createHarness('task028-direct-hit')
  try {
    const toolCall = {
      tool_name: 'ledger.add_expense',
      arguments: {
        amount: 32,
        categoryName: '餐饮',
        sourceText: '今天中午吃饭花了32块'
      }
    }

    const policy = evaluateToolCalls([toolCall], {
      sourceText: '今天中午吃饭花了32块',
      store: harness.store
    })

    assert(policy.decision === 'allow', 'expected allow decision', policy)

    const resolvedCall = policy.toolCalls[0]
    assert(resolvedCall.arguments.categoryId, 'expected resolved categoryId', resolvedCall)

    const ledger = createLedgerService(harness.store)
    const entry = ledger.addExpense({
      ...resolvedCall.arguments,
      occurredAt: '2026-06-26T12:00:00.000Z'
    })

    const savedEntry = getLedgerEntry(harness.store, entry.id)
    assert(savedEntry?.categoryName === '餐饮', 'expected saved ledger entry category to be 餐饮', savedEntry)
    assert(
      harness.categoryAuditLogs.some((item) => item.eventType === 'category_mapping_resolved'),
      'expected category_mapping_resolved audit log',
      harness.categoryAuditLogs
    )

    return {
      decision: policy.decision,
      entryId: entry.id,
      categoryName: savedEntry.categoryName
    }
  } finally {
    harness.restore()
  }
}

async function caseCreateAndResume() {
  const harness = await createHarness('task028-create-resume')
  try {
    const confirmService = createConfirmService(harness.store)
    const pending = confirmService.createPending({
      date: verifyDate,
      conversationMessageId: 'msg-create-resume',
      sourceText: '今天给猫买罐头花了89块',
      assistantReply: '小铃湾想先确认是否新增宠物用品类目。',
      toolCalls: [
        {
          tool_name: 'ledger.add_expense',
          arguments: {
            amount: 89,
            categoryName: null,
            needsNewCategory: true,
            proposedCategoryName: '宠物用品',
            sourceText: '今天给猫买罐头花了89块',
            occurredAt: '2026-06-26T13:00:00.000Z'
          }
        }
      ],
      confirmRequest: {
        kind: 'category_creation_confirmation',
        toolName: 'ledger.add_expense',
        domain: 'ledger',
        proposedCategoryName: '宠物用品',
        reason: '当前收支找不到合适类目，建议先新增类目，等待主人确认。',
        sourceText: '今天给猫买罐头花了89块',
        pendingAction: {
          toolName: 'ledger.add_expense',
          arguments: {
            amount: 89,
            needsNewCategory: true,
            proposedCategoryName: '宠物用品',
            sourceText: '今天给猫买罐头花了89块',
            occurredAt: '2026-06-26T13:00:00.000Z'
          }
        }
      }
    })

    const approved = confirmService.approve(pending.id)
    assert(approved.status === 'approved', 'expected pending confirmation approved', approved)

    const result = await confirmService.executeApprovedConfirmation(pending.id)
    const confirmation = getPendingConfirmation(harness.store, pending.id)
    const categories = listLedgerCategories(harness.store, { type: 'expense' })
    const petCategory = categories.find((item) => item.name === '宠物用品')

    assert(confirmation?.status === 'executed', 'expected confirmation executed', confirmation)
    assert(petCategory, 'expected 宠物用品 category created', categories)
    assert(
      result.toolExecution.results.some(
        (item) => item.tool_name === 'ledger.add_expense' && item.ok === true
      ),
      'expected resumed ledger.add_expense execution success',
      result.toolExecution
    )
    assert(
      harness.categoryAuditLogs.some((item) => item.eventType === 'category_creation_approved'),
      'expected category_creation_approved audit log',
      harness.categoryAuditLogs
    )
    assert(
      harness.categoryAuditLogs.some((item) => item.eventType === 'category_action_resumed'),
      'expected category_action_resumed audit log',
      harness.categoryAuditLogs
    )

    const resumedEntryResult = result.toolExecution.results.find(
      (item) => item.tool_name === 'ledger.add_expense'
    )
    const savedEntry = getLedgerEntry(harness.store, resumedEntryResult?.result?.id)
    assert(savedEntry?.categoryName === '宠物用品', 'expected resumed entry saved with 宠物用品', savedEntry)

    return {
      confirmationStatus: confirmation.status,
      categoryId: petCategory.id,
      resumedEntryId: savedEntry.id
    }
  } finally {
    harness.restore()
  }
}

async function caseReuseDuplicateCategory() {
  const harness = await createHarness('task028-reuse-duplicate')
  try {
    const confirmService = createConfirmService(harness.store)
    const pending = confirmService.createPending({
      date: verifyDate,
      conversationMessageId: 'msg-reuse-duplicate',
      sourceText: '今天给猫买零食花了35块',
      assistantReply: '小铃湾想先确认是否新增宠物用品类目。',
      toolCalls: [
        {
          tool_name: 'ledger.add_expense',
          arguments: {
            amount: 35,
            needsNewCategory: true,
            proposedCategoryName: '宠物用品',
            sourceText: '今天给猫买零食花了35块',
            occurredAt: '2026-06-26T14:00:00.000Z'
          }
        }
      ],
      confirmRequest: {
        kind: 'category_creation_confirmation',
        toolName: 'ledger.add_expense',
        domain: 'ledger',
        proposedCategoryName: '宠物用品',
        reason: '当前收支找不到合适类目，建议先新增类目，等待主人确认。',
        sourceText: '今天给猫买零食花了35块',
        pendingAction: {
          toolName: 'ledger.add_expense',
          arguments: {
            amount: 35,
            needsNewCategory: true,
            proposedCategoryName: '宠物用品',
            sourceText: '今天给猫买零食花了35块',
            occurredAt: '2026-06-26T14:00:00.000Z'
          }
        }
      }
    })

    confirmService.approve(pending.id)
    await confirmService.executeApprovedConfirmation(pending.id)

    const categoriesAfterFirstRun = listLedgerCategories(harness.store, { type: 'expense' })
    const firstPetCategoryCount = categoriesAfterFirstRun.filter((item) => item.name === '宠物用品').length
    assert(firstPetCategoryCount === 1, 'expected only one 宠物用品 category after first run', categoriesAfterFirstRun)

    const secondPending = confirmService.createPending({
      date: verifyDate,
      conversationMessageId: 'msg-reuse-duplicate-2',
      sourceText: '今天给猫买湿粮花了25块',
      assistantReply: '小铃湾想先确认是否新增宠物用品类目。',
      toolCalls: [
        {
          tool_name: 'ledger.add_expense',
          arguments: {
            amount: 25,
            needsNewCategory: true,
            proposedCategoryName: '宠物用品',
            sourceText: '今天给猫买湿粮花了25块',
            occurredAt: '2026-06-26T15:00:00.000Z'
          }
        }
      ],
      confirmRequest: {
        kind: 'category_creation_confirmation',
        toolName: 'ledger.add_expense',
        domain: 'ledger',
        proposedCategoryName: '宠物用品',
        reason: '当前收支找不到合适类目，建议先新增类目，等待主人确认。',
        sourceText: '今天给猫买湿粮花了25块',
        pendingAction: {
          toolName: 'ledger.add_expense',
          arguments: {
            amount: 25,
            needsNewCategory: true,
            proposedCategoryName: '宠物用品',
            sourceText: '今天给猫买湿粮花了25块',
            occurredAt: '2026-06-26T15:00:00.000Z'
          }
        }
      }
    })

    confirmService.approve(secondPending.id)
    await confirmService.executeApprovedConfirmation(secondPending.id)

    const categoriesAfterSecondRun = listLedgerCategories(harness.store, { type: 'expense' })
    const secondPetCategoryCount = categoriesAfterSecondRun.filter((item) => item.name === '宠物用品').length
    assert(secondPetCategoryCount === 1, 'expected duplicate category reused instead of recreated', categoriesAfterSecondRun)
    assert(
      harness.categoryAuditLogs.some((item) => item.eventType === 'category_creation_reused_existing'),
      'expected category_creation_reused_existing audit log',
      harness.categoryAuditLogs
    )

    return {
      categoryCount: secondPetCategoryCount
    }
  } finally {
    harness.restore()
  }
}

async function caseRejectNoWrite() {
  const harness = await createHarness('task028-reject-no-write')
  try {
    const confirmService = createConfirmService(harness.store)
    const beforeCategories = listLedgerCategories(harness.store, { type: 'expense' }).length
    const beforeEntries = listTodoEntries(harness.store, { status: 'pending' }).length

    const pending = confirmService.createPending({
      date: verifyDate,
      conversationMessageId: 'msg-reject-no-write',
      sourceText: '今天给猫买罐头花了89块',
      assistantReply: '小铃湾想先确认是否新增喵星补给类目。',
      toolCalls: [
        {
          tool_name: 'ledger.add_expense',
          arguments: {
            amount: 89,
            needsNewCategory: true,
            proposedCategoryName: '喵星补给',
            sourceText: '今天给猫买罐头花了89块',
            occurredAt: '2026-06-26T16:00:00.000Z'
          }
        }
      ],
      confirmRequest: {
        kind: 'category_creation_confirmation',
        toolName: 'ledger.add_expense',
        domain: 'ledger',
        proposedCategoryName: '喵星补给',
        reason: '当前收支找不到合适类目，建议先新增类目，等待主人确认。',
        sourceText: '今天给猫买罐头花了89块',
        pendingAction: {
          toolName: 'ledger.add_expense',
          arguments: {
            amount: 89,
            needsNewCategory: true,
            proposedCategoryName: '喵星补给',
            sourceText: '今天给猫买罐头花了89块',
            occurredAt: '2026-06-26T16:00:00.000Z'
          }
        }
      }
    })

    const rejection = confirmService.rejectConfirmation(pending.id)
    const afterCategories = listLedgerCategories(harness.store, { type: 'expense' }).length
    const afterEntries = listPendingConfirmationsByDate(harness.store, { date: verifyDate }).length

    assert(rejection.confirmation.status === 'rejected', 'expected confirmation rejected', rejection)
    assert(rejection.categoryRejectResolution?.mode === 'closed_without_write', 'expected closed_without_write resolution', rejection)
    assert(beforeCategories === afterCategories, 'expected category count unchanged after rejection', { beforeCategories, afterCategories })
    assert(
      harness.categoryAuditLogs.some((item) => item.eventType === 'category_creation_rejected'),
      'expected category_creation_rejected audit log',
      harness.categoryAuditLogs
    )

    return {
      pendingConfirmationCount: afterEntries,
      todoPendingCountSnapshot: beforeEntries
    }
  } finally {
    harness.restore()
  }
}

async function caseAskBackDowngrade() {
  const harness = await createHarness('task028-ask-back')
  try {
    const toolCall = {
      tool_name: 'ledger.add_expense',
      arguments: {
        amount: 50,
        needsNewCategory: true,
        proposedCategoryName: '其他',
        sourceText: '今天这笔花销记一下，类目就叫其他吧'
      }
    }

    const policy = evaluateToolCalls([toolCall], {
      sourceText: '今天这笔花销记一下，类目就叫其他吧',
      store: harness.store
    })

    assert(policy.decision === 'ask_back', 'expected ask_back decision for vague category name', policy)
    assert(
      harness.categoryAuditLogs.some((item) => item.eventType === 'category_mapping_ask_back'),
      'expected category_mapping_ask_back audit log',
      harness.categoryAuditLogs
    )

    return {
      decision: policy.decision,
      question: policy.question
    }
  } finally {
    harness.restore()
  }
}

async function caseLookupContextExtraction() {
  const harness = await createHarness('task028-lookup')
  try {
    const listTool = getTool('ledger_category.list_expense')
    assert(listTool, 'expected ledger_category.list_expense registered')

    const result = await listTool.handler({}, { date: verifyDate, store: harness.store })
    assert(result.ok === true, 'expected lookup tool success', result)
    assert(Array.isArray(result.result?.items), 'expected lookup items array', result.result)
    assert(
      result.result.items.some((item) => item.name === '餐饮'),
      'expected lookup result includes 餐饮',
      result.result
    )

    return {
      total: result.result.total,
      firstNames: result.result.items.slice(0, 3).map((item) => item.name)
    }
  } finally {
    harness.restore()
  }
}

async function caseTodoDirectHit() {
  const harness = await createHarness('task029-todo-direct-hit')
  try {
    const toolCall = {
      tool_name: 'todo.create',
      arguments: {
        title: '今晚复习英语',
        categoryName: '学习',
        sourceText: '帮我记个待办，今晚复习英语，放到学习类'
      }
    }

    const policy = evaluateToolCalls([toolCall], {
      sourceText: '帮我记个待办，今晚复习英语，放到学习类',
      store: harness.store
    })

    assert(policy.decision === 'allow', 'expected todo.create allow decision', policy)
    assert(policy.toolCalls[0].arguments.categoryId, 'expected resolved todo categoryId', policy.toolCalls[0])

    const todo = createTodoService(harness.store)
    const entry = todo.create(policy.toolCalls[0].arguments)
    const savedEntry = getTodoEntry(harness.store, entry.id)

    assert(savedEntry?.categoryName === '学习', 'expected todo entry category to be 学习', savedEntry)
    assert(
      harness.categoryAuditLogs.some(
        (item) => item.eventType === 'category_mapping_resolved' && item.domain === 'todo'
      ),
      'expected todo category_mapping_resolved audit log',
      harness.categoryAuditLogs
    )

    return {
      decision: policy.decision,
      entryId: entry.id,
      categoryName: savedEntry.categoryName
    }
  } finally {
    harness.restore()
  }
}

async function caseTodoUpdateCategoryRemap() {
  const harness = await createHarness('task029-todo-update-remap')
  try {
    const todo = createTodoService(harness.store)
    const original = todo.create({
      title: '周末采购猫粮',
      categoryName: '生活',
      categoryId: 'todo_life',
      sourceText: '提醒我周末采购猫粮'
    })

    const toolCall = {
      tool_name: 'todo.update',
      arguments: {
        id: original.id,
        categoryName: '学习',
        sourceText: '把这个待办改到学习类'
      }
    }

    const policy = evaluateToolCalls([toolCall], {
      sourceText: '把这个待办改到学习类',
      store: harness.store
    })

    assert(policy.decision === 'allow', 'expected todo.update allow decision', policy)
    assert(policy.toolCalls[0].arguments.categoryId, 'expected resolved todo.update categoryId', policy.toolCalls[0])

    const updated = todo.update(policy.toolCalls[0].arguments)
    const savedEntry = getTodoEntry(harness.store, updated.id)

    assert(savedEntry?.title === '周末采购猫粮', 'expected todo.update to preserve original title', savedEntry)
    assert(savedEntry?.categoryName === '学习', 'expected todo.update category remapped to 学习', savedEntry)
    assert(
      harness.categoryAuditLogs.filter(
        (item) => item.eventType === 'category_mapping_resolved' && item.domain === 'todo'
      ).length >= 1,
      'expected todo category_mapping_resolved audit log during update',
      harness.categoryAuditLogs
    )

    return {
      entryId: updated.id,
      title: savedEntry.title,
      categoryName: savedEntry.categoryName
    }
  } finally {
    harness.restore()
  }
}

const cases = [
  ['TC-001 direct hit allow', caseDirectHit],
  ['TC-005 create category and resume action', caseCreateAndResume],
  ['TC-009 duplicate category reused', caseReuseDuplicateCategory],
  ['TC-008 reject without write', caseRejectNoWrite],
  ['TC-010 ask_back downgrade', caseAskBackDowngrade],
  ['TC-012 lookup tool smoke', caseLookupContextExtraction],
  ['TC-003 todo direct hit allow', caseTodoDirectHit],
  ['TC-029 todo update category remap', caseTodoUpdateCategoryRemap]
]

const results = []
for (const [name, fn] of cases) {
  results.push(await runCase(name, fn))
}

const failures = results.filter((item) => !item.ok)
for (const result of results) {
  if (result.ok) {
    console.log(`PASS ${result.name} (${result.durationMs}ms)`)
    console.log(`  detail: ${JSON.stringify(result.detail)}`)
  } else {
    console.log(`FAIL ${result.name} (${result.durationMs}ms)`)
    console.log(`  error: ${JSON.stringify(result.error)}`)
  }
}

global.fetch = originalFetch

if (failures.length > 0) {
  console.log(`Category flow verification failed: ${failures.length}/${results.length} cases failed.`)
  process.exit(1)
}

console.log(`Category flow verification passed: ${results.length}/${results.length} cases passed.`)
