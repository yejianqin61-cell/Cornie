import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  getPendingConfirmation,
  getLedgerEntry,
  getScheduleEntry,
  listLedgerCategories,
  listPendingConfirmationsByDate,
  getTodoEntry,
  listTodoEntries,
  openDb
} from '../electron/db.js'
import { createConfirmService } from '../electron/backend/confirm/service.js'
import {
  cacheReadOnlyLookupResult,
  canExecuteReadOnlyLookupRound,
  createToolRoundState,
  extractReadOnlyLookupContext,
  getCachedReadOnlyLookupResult,
  isReadOnlyLookupRound,
  recordToolRoundState
} from '../electron/backend/agent/toolRoundState.js'
import { createCategoryDomainRegistry } from '../electron/backend/category/domainRegistry.js'
import { registerLedgerTools } from '../electron/backend/ledger/tools.js'
import { createLedgerService } from '../electron/backend/ledger/service.js'
import { evaluateToolCalls } from '../electron/backend/policy/toolPolicy.js'
import { createScheduleService } from '../electron/backend/schedule/service.js'
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

function buildCaseDetail(domain, scenario, detail) {
  return {
    domain,
    scenario,
    ...detail
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

    return buildCaseDetail('ledger', 'direct_hit_allow', {
      decision: policy.decision,
      entryId: entry.id,
      categoryName: savedEntry.categoryName
    })
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

    return buildCaseDetail('ledger', 'confirm_create_and_resume', {
      confirmationStatus: confirmation.status,
      categoryId: petCategory.id,
      resumedEntryId: savedEntry.id
    })
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

    return buildCaseDetail('ledger', 'reuse_duplicate_category', {
      categoryCount: secondPetCategoryCount
    })
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

    return buildCaseDetail('ledger', 'reject_without_write', {
      pendingConfirmationCount: afterEntries,
      todoPendingCountSnapshot: beforeEntries
    })
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

    return buildCaseDetail('ledger', 'ask_back_downgrade', {
      decision: policy.decision,
      question: policy.question
    })
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
    const lookupContexts = extractReadOnlyLookupContext({
      results: [
        {
          ok: true,
          tool_name: 'ledger_category.list_expense',
          result: result.result
        }
      ]
    })

    assert(lookupContexts.length === 1, 'expected one normalized lookup context', lookupContexts)
    assert(lookupContexts[0].domain === 'ledger', 'expected lookup context domain ledger', lookupContexts[0])
    assert(lookupContexts[0].lookupType === 'category', 'expected normalized lookupType category', lookupContexts[0])
    assert(lookupContexts[0].categoryType === 'expense', 'expected ledger expense categoryType', lookupContexts[0])

    return buildCaseDetail('ledger', 'lookup_context_extraction', {
      total: result.result.total,
      firstNames: result.result.items.slice(0, 3).map((item) => item.name),
      normalizedDomain: lookupContexts[0].domain,
      normalizedCategoryType: lookupContexts[0].categoryType
    })
  } finally {
    harness.restore()
  }
}

async function caseTodoLookupRoundLimit() {
  const todoLookupCall = {
    tool_name: 'todo_category.list',
    arguments: { query: '学习' }
  }
  const roundState = createToolRoundState()

  assert(isReadOnlyLookupRound([todoLookupCall]) === true, 'expected todo lookup recognized as lookup-only round')
  assert(
    canExecuteReadOnlyLookupRound(roundState, [todoLookupCall]) === true,
    'expected first todo lookup round allowed',
    roundState
  )

  recordToolRoundState(roundState, {
    results: [
      {
        ok: true,
        tool_name: 'todo_category.list',
        result: {
          query: '学习',
          total: 3,
          items: [
            { id: 'todo_general', name: '待办', status: 'active' },
            { id: 'todo_study', name: '学习', status: 'active' }
          ]
        }
      }
    ]
  })

  assert(roundState.lookupUsageByDomain.todo === 1, 'expected todo lookup usage counted once', roundState)
  assert(
    canExecuteReadOnlyLookupRound(roundState, [todoLookupCall]) === false,
    'expected second todo lookup round blocked',
    roundState
  )
  assert(
    canExecuteReadOnlyLookupRound(roundState, [{ tool_name: 'schedule_category.list', arguments: {} }]) === true,
    'expected schedule lookup remains allowed after todo lookup',
    roundState
  )

  return buildCaseDetail('todo', 'lookup_round_limit', {
    todoLookupCount: roundState.lookupUsageByDomain.todo,
    scheduleLookupAvailable: canExecuteReadOnlyLookupRound(roundState, [
      { tool_name: 'schedule_category.list', arguments: {} }
    ])
  })
}

async function caseScheduleLookupRoundLimit() {
  const scheduleLookupCall = {
    tool_name: 'schedule_category.list',
    arguments: { query: '会议' }
  }
  const roundState = createToolRoundState()

  assert(
    canExecuteReadOnlyLookupRound(roundState, [scheduleLookupCall]) === true,
    'expected first schedule lookup round allowed',
    roundState
  )

  recordToolRoundState(roundState, {
    results: [
      {
        ok: true,
        tool_name: 'schedule_category.list',
        result: {
          query: '会议',
          total: 3,
          items: [
            { id: 'schedule_general', name: '日程', status: 'active' },
            { id: 'schedule_meeting', name: '会议', status: 'active' }
          ]
        }
      }
    ]
  })

  assert(roundState.lookupUsageByDomain.schedule === 1, 'expected schedule lookup usage counted once', roundState)
  assert(
    canExecuteReadOnlyLookupRound(roundState, [scheduleLookupCall]) === false,
    'expected second schedule lookup round blocked',
    roundState
  )
  assert(
    canExecuteReadOnlyLookupRound(roundState, [{ tool_name: 'ledger_category.list_expense', arguments: {} }]) === true,
    'expected ledger lookup still allowed after schedule lookup',
    roundState
  )

  return buildCaseDetail('schedule', 'lookup_round_limit', {
    scheduleLookupCount: roundState.lookupUsageByDomain.schedule,
    ledgerLookupAvailable: canExecuteReadOnlyLookupRound(roundState, [
      { tool_name: 'ledger_category.list_expense', arguments: {} }
    ])
  })
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

    return buildCaseDetail('todo', 'direct_hit_allow', {
      decision: policy.decision,
      entryId: entry.id,
      categoryName: savedEntry.categoryName
    })
  } finally {
    harness.restore()
  }
}

async function caseLedgerLookupCacheReuse() {
  const roundState = createToolRoundState()
  const ledgerLookupCall = {
    tool_name: 'ledger_category.list_expense',
    arguments: { query: '餐饮' }
  }

  const firstLookupResult = {
    ok: true,
    tool_name: 'ledger_category.list_expense',
    result: {
      query: '餐饮',
      total: 2,
      items: [
        { id: 'expense_food', name: '餐饮', status: 'active', type: 'expense' },
        { id: 'expense_snack', name: '零食', status: 'active', type: 'expense' }
      ]
    }
  }

  cacheReadOnlyLookupResult(roundState, ledgerLookupCall, firstLookupResult)
  recordToolRoundState(roundState, { results: [firstLookupResult] })

  const cachedResult = getCachedReadOnlyLookupResult(roundState, {
    tool_name: 'ledger_category.list_expense',
    arguments: { query: ' 餐 饮！ ' }
  })

  assert(cachedResult, 'expected cached ledger lookup result', roundState)
  recordToolRoundState(roundState, { results: [cachedResult] })

  assert(roundState.lookupUsageByDomain.ledger === 1, 'expected cache hit not to consume ledger lookup usage', roundState)
  assert(
    roundState.lastReadOnlyLookups[0]?.hitSource === 'cache',
    'expected ledger cache hit marked as cache',
    roundState.lastReadOnlyLookups
  )

  return buildCaseDetail('ledger', 'lookup_cache_reuse', {
    lookupUsage: roundState.lookupUsageByDomain.ledger,
    hitSource: roundState.lastReadOnlyLookups[0]?.hitSource,
    normalizedQuery: roundState.lastReadOnlyLookups[0]?.normalizedQuery
  })
}

async function caseTodoLookupCacheReuse() {
  const roundState = createToolRoundState()
  const todoLookupCall = {
    tool_name: 'todo_category.list',
    arguments: { query: '学习' }
  }

  const firstLookupResult = {
    ok: true,
    tool_name: 'todo_category.list',
    result: {
      query: '学习',
      total: 2,
      items: [
        { id: 'todo_study', name: '学习', status: 'active' },
        { id: 'todo_general', name: '待办', status: 'active' }
      ]
    }
  }

  cacheReadOnlyLookupResult(roundState, todoLookupCall, firstLookupResult)
  recordToolRoundState(roundState, { results: [firstLookupResult] })

  const cachedResult = getCachedReadOnlyLookupResult(roundState, {
    tool_name: 'todo_category.list',
    arguments: { query: ' 学 习。' }
  })

  assert(cachedResult, 'expected cached todo lookup result', roundState)
  recordToolRoundState(roundState, { results: [cachedResult] })

  assert(roundState.lookupUsageByDomain.todo === 1, 'expected cache hit not to consume todo lookup usage', roundState)
  assert(
    getCachedReadOnlyLookupResult(roundState, {
      tool_name: 'schedule_category.list',
      arguments: { query: '学习' }
    }) === null,
    'expected same query not to leak across domains',
    roundState
  )

  return buildCaseDetail('todo', 'lookup_cache_reuse', {
    lookupUsage: roundState.lookupUsageByDomain.todo,
    hitSource: roundState.lastReadOnlyLookups[0]?.hitSource,
    normalizedQuery: roundState.lastReadOnlyLookups[0]?.normalizedQuery
  })
}

async function caseScheduleLookupCacheReuse() {
  const roundState = createToolRoundState()
  const scheduleLookupCall = {
    tool_name: 'schedule_category.list',
    arguments: { query: '复查' }
  }

  const firstLookupResult = {
    ok: true,
    tool_name: 'schedule_category.list',
    result: {
      query: '复查',
      total: 2,
      items: [
        { id: 'schedule_medical', name: '复查', status: 'active' },
        { id: 'schedule_general', name: '日程', status: 'active' }
      ]
    }
  }

  cacheReadOnlyLookupResult(roundState, scheduleLookupCall, firstLookupResult)
  recordToolRoundState(roundState, { results: [firstLookupResult] })

  const cachedResult = getCachedReadOnlyLookupResult(roundState, {
    tool_name: 'schedule_category.list',
    arguments: { query: '复 查！' }
  })

  assert(cachedResult, 'expected cached schedule lookup result', roundState)
  recordToolRoundState(roundState, { results: [cachedResult] })

  assert(
    roundState.lookupUsageByDomain.schedule === 1,
    'expected cache hit not to consume schedule lookup usage',
    roundState
  )
  assert(
    roundState.lastReadOnlyLookups[0]?.query === '复 查！',
    'expected cached schedule lookup preserves current query',
    roundState.lastReadOnlyLookups
  )

  return buildCaseDetail('schedule', 'lookup_cache_reuse', {
    lookupUsage: roundState.lookupUsageByDomain.schedule,
    hitSource: roundState.lastReadOnlyLookups[0]?.hitSource,
    normalizedQuery: roundState.lastReadOnlyLookups[0]?.normalizedQuery
  })
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

    return buildCaseDetail('todo', 'update_category_remap', {
      entryId: updated.id,
      title: savedEntry.title,
      categoryName: savedEntry.categoryName
    })
  } finally {
    harness.restore()
  }
}

async function caseCategoryDomainRegistryValidation() {
  let error = null

  try {
    createCategoryDomainRegistry([
      {
        domain: 'broken',
        label: '损坏域',
        actionToolNames: ['broken.create'],
        readOnlyLookups: [
          {
            toolName: 'broken_category.list',
            lookupType: 'category'
          }
        ],
        getCategoryLists() {
          return []
        },
        buildCategoryCreateToolCall() {
          return { tool_name: 'broken_category.create', arguments: { name: '测试' } }
        },
        getCategorySnapshot() {
          return []
        },
        formatSummaryLines() {
          return ['损坏域：无']
        },
        summarizeSnapshotForAudit() {
          return 'broken=0'
        }
      }
    ])
  } catch (caughtError) {
    error = caughtError
  }

  assert(error, 'expected invalid category domain registration to throw')
  assert(
    error.message.includes('buildRejectResolutionReason'),
    'expected missing capability error mentions buildRejectResolutionReason',
    error
  )

  return buildCaseDetail('registry', 'missing_required_capability', {
    errorMessage: error.message
  })
}

async function caseScheduleDirectHit() {
  const harness = await createHarness('task030-schedule-direct-hit')
  try {
    const toolCall = {
      tool_name: 'schedule.create',
      arguments: {
        title: '产品评审会',
        startAt: '2026-07-01T15:00:00.000Z',
        categoryName: '会议',
        sourceText: '下周二下午三点开产品评审会'
      }
    }

    const policy = evaluateToolCalls([toolCall], {
      sourceText: '下周二下午三点开产品评审会',
      store: harness.store
    })

    assert(policy.decision === 'allow', 'expected schedule.create allow decision', policy)
    assert(policy.toolCalls[0].arguments.categoryId, 'expected resolved schedule categoryId', policy.toolCalls[0])

    const schedule = createScheduleService(harness.store)
    const entry = schedule.create(policy.toolCalls[0].arguments)
    const savedEntry = getScheduleEntry(harness.store, entry.id)

    assert(savedEntry?.categoryName === '会议', 'expected schedule entry category to be 会议', savedEntry)
    assert(
      harness.categoryAuditLogs.some(
        (item) => item.eventType === 'category_mapping_resolved' && item.domain === 'schedule'
      ),
      'expected schedule category_mapping_resolved audit log',
      harness.categoryAuditLogs
    )

    return buildCaseDetail('schedule', 'direct_hit_allow', {
      decision: policy.decision,
      entryId: entry.id,
      categoryName: savedEntry.categoryName
    })
  } finally {
    harness.restore()
  }
}

async function caseScheduleUpdateCategoryRemap() {
  const harness = await createHarness('task030-schedule-update-remap')
  try {
    const schedule = createScheduleService(harness.store)
    const original = schedule.create({
      title: '给猫复查',
      startAt: '2026-07-02T10:00:00.000Z',
      location: '宠物医院',
      categoryName: '日程',
      categoryId: 'schedule_general',
      sourceText: '周四上午十点带猫复查'
    })

    const toolCall = {
      tool_name: 'schedule.update',
      arguments: {
        id: original.id,
        categoryName: '提醒',
        sourceText: '帮我把这个日程改到提醒类'
      }
    }

    const policy = evaluateToolCalls([toolCall], {
      sourceText: '帮我把这个日程改到提醒类',
      store: harness.store
    })

    assert(policy.decision === 'allow', 'expected schedule.update allow decision', policy)
    assert(policy.toolCalls[0].arguments.categoryId, 'expected resolved schedule.update categoryId', policy.toolCalls[0])

    const updated = schedule.update(policy.toolCalls[0].arguments)
    const savedEntry = getScheduleEntry(harness.store, updated.id)

    assert(savedEntry?.title === '给猫复查', 'expected schedule.update to preserve original title', savedEntry)
    assert(savedEntry?.location === '宠物医院', 'expected schedule.update to preserve original location', savedEntry)
    assert(savedEntry?.categoryName === '提醒', 'expected schedule.update category remapped to 提醒', savedEntry)
    assert(
      harness.categoryAuditLogs.filter(
        (item) => item.eventType === 'category_mapping_resolved' && item.domain === 'schedule'
      ).length >= 1,
      'expected schedule category_mapping_resolved audit log during update',
      harness.categoryAuditLogs
    )

    return buildCaseDetail('schedule', 'update_category_remap', {
      entryId: updated.id,
      title: savedEntry.title,
      categoryName: savedEntry.categoryName,
      location: savedEntry.location
    })
  } finally {
    harness.restore()
  }
}

async function caseTodoCreateCategoryConfirmResume() {
  const harness = await createHarness('task031-todo-create-confirm')
  try {
    const confirmService = createConfirmService(harness.store)
    const todo = createTodoService(harness.store)

    const pending = confirmService.createPending({
      date: verifyDate,
      conversationMessageId: 'msg-todo-create-confirm',
      sourceText: '新增一个给猫买驱虫药的待办，类目没有就新建宠物护理',
      assistantReply: '小铃湾想先确认是否新增宠物护理待办类目。',
      toolCalls: [
        {
          tool_name: 'todo.create',
          arguments: {
            title: '给猫买驱虫药',
            dueAt: '2026-06-30T20:00:00.000Z',
            needsNewCategory: true,
            proposedCategoryName: '宠物护理',
            sourceText: '新增一个给猫买驱虫药的待办，类目没有就新建宠物护理'
          }
        }
      ],
      confirmRequest: {
        kind: 'category_creation_confirmation',
        toolName: 'todo.create',
        domain: 'todo',
        proposedCategoryName: '宠物护理',
        reason: '当前待办找不到合适分类，建议先新增待办类目，等待主人确认。',
        sourceText: '新增一个给猫买驱虫药的待办，类目没有就新建宠物护理',
        pendingAction: {
          toolName: 'todo.create',
          arguments: {
            title: '给猫买驱虫药',
            dueAt: '2026-06-30T20:00:00.000Z',
            needsNewCategory: true,
            proposedCategoryName: '宠物护理',
            sourceText: '新增一个给猫买驱虫药的待办，类目没有就新建宠物护理'
          }
        }
      }
    })

    confirmService.approve(pending.id)
    const result = await confirmService.executeApprovedConfirmation(pending.id)
    const categories = todo.listCategories()
    const createdCategory = categories.find((item) => item.name === '宠物护理')
    const resumedResult = result.toolExecution.results.find((item) => item.tool_name === 'todo.create')
    const savedEntry = getTodoEntry(harness.store, resumedResult?.result?.id)

    assert(createdCategory, 'expected 宠物护理 todo category created', categories)
    assert(savedEntry?.title === '给猫买驱虫药', 'expected todo entry created after confirmation', savedEntry)
    assert(savedEntry?.categoryName === '宠物护理', 'expected todo entry mapped to 宠物护理', savedEntry)
    assert(
      harness.categoryAuditLogs.some(
        (item) => item.eventType === 'category_action_resumed' && item.domain === 'todo'
      ),
      'expected todo category_action_resumed audit log',
      harness.categoryAuditLogs
    )

    return buildCaseDetail('todo', 'confirm_create_and_resume', {
      categoryId: createdCategory.id,
      entryId: savedEntry.id,
      categoryName: savedEntry.categoryName
    })
  } finally {
    harness.restore()
  }
}

async function caseTodoUpdateCategoryConfirmResume() {
  const harness = await createHarness('task031-todo-update-confirm')
  try {
    const confirmService = createConfirmService(harness.store)
    const todo = createTodoService(harness.store)
    const original = todo.create({
      title: '给猫补货罐头',
      categoryId: 'todo_life',
      categoryName: '生活',
      dueAt: '2026-06-30T18:00:00.000Z',
      sourceText: '给猫补货罐头'
    })

    const pending = confirmService.createPending({
      date: verifyDate,
      conversationMessageId: 'msg-todo-update-confirm',
      sourceText: '把这个待办改到宠物护理，没有就新建',
      assistantReply: '小铃湾想先确认是否新增宠物护理待办类目。',
      toolCalls: [
        {
          tool_name: 'todo.update',
          arguments: {
            id: original.id,
            needsNewCategory: true,
            proposedCategoryName: '宠物护理',
            sourceText: '把这个待办改到宠物护理，没有就新建'
          }
        }
      ],
      confirmRequest: {
        kind: 'category_creation_confirmation',
        toolName: 'todo.update',
        domain: 'todo',
        proposedCategoryName: '宠物护理',
        reason: '当前待办找不到合适分类，建议先新增待办类目，等待主人确认。',
        sourceText: '把这个待办改到宠物护理，没有就新建',
        pendingAction: {
          toolName: 'todo.update',
          arguments: {
            id: original.id,
            needsNewCategory: true,
            proposedCategoryName: '宠物护理',
            sourceText: '把这个待办改到宠物护理，没有就新建'
          }
        }
      }
    })

    confirmService.approve(pending.id)
    const result = await confirmService.executeApprovedConfirmation(pending.id)
    const resumedResult = result.toolExecution.results.find((item) => item.tool_name === 'todo.update')
    const savedEntry = getTodoEntry(harness.store, resumedResult?.result?.id ?? original.id)

    assert(savedEntry?.title === '给猫补货罐头', 'expected todo.update to preserve original title after confirmation', savedEntry)
    assert(savedEntry?.categoryName === '宠物护理', 'expected todo.update remapped to 宠物护理 after confirmation', savedEntry)
    assert(
      harness.categoryAuditLogs.some(
        (item) => item.eventType === 'category_action_resumed' && item.domain === 'todo'
      ),
      'expected todo update resume audit log',
      harness.categoryAuditLogs
    )

    return buildCaseDetail('todo', 'confirm_update_and_resume', {
      entryId: savedEntry.id,
      title: savedEntry.title,
      categoryName: savedEntry.categoryName
    })
  } finally {
    harness.restore()
  }
}

async function caseScheduleCreateCategoryConfirmResume() {
  const harness = await createHarness('task031-schedule-create-confirm')
  try {
    const confirmService = createConfirmService(harness.store)
    const schedule = createScheduleService(harness.store)

    const pending = confirmService.createPending({
      date: verifyDate,
      conversationMessageId: 'msg-schedule-create-confirm',
      sourceText: '下周带猫复查，类目没有就新建宠物医疗日程类目',
      assistantReply: '小铃湾想先确认是否新增宠物医疗日程类目。',
      toolCalls: [
        {
          tool_name: 'schedule.create',
          arguments: {
            title: '带猫复查',
            startAt: '2026-07-03T09:30:00.000Z',
            location: '宠物医院',
            needsNewCategory: true,
            proposedCategoryName: '宠物医疗',
            sourceText: '下周带猫复查，类目没有就新建宠物医疗日程类目'
          }
        }
      ],
      confirmRequest: {
        kind: 'category_creation_confirmation',
        toolName: 'schedule.create',
        domain: 'schedule',
        proposedCategoryName: '宠物医疗',
        reason: '当前日程找不到合适分类，建议先新增日程类目，等待主人确认。',
        sourceText: '下周带猫复查，类目没有就新建宠物医疗日程类目',
        pendingAction: {
          toolName: 'schedule.create',
          arguments: {
            title: '带猫复查',
            startAt: '2026-07-03T09:30:00.000Z',
            location: '宠物医院',
            needsNewCategory: true,
            proposedCategoryName: '宠物医疗',
            sourceText: '下周带猫复查，类目没有就新建宠物医疗日程类目'
          }
        }
      }
    })

    confirmService.approve(pending.id)
    const result = await confirmService.executeApprovedConfirmation(pending.id)
    const categories = schedule.listCategories()
    const createdCategory = categories.find((item) => item.name === '宠物医疗')
    const resumedResult = result.toolExecution.results.find((item) => item.tool_name === 'schedule.create')
    const savedEntry = getScheduleEntry(harness.store, resumedResult?.result?.id)

    assert(createdCategory, 'expected 宠物医疗 schedule category created', categories)
    assert(savedEntry?.title === '带猫复查', 'expected schedule entry created after confirmation', savedEntry)
    assert(savedEntry?.categoryName === '宠物医疗', 'expected schedule entry mapped to 宠物医疗', savedEntry)
    assert(
      harness.categoryAuditLogs.some(
        (item) => item.eventType === 'category_action_resumed' && item.domain === 'schedule'
      ),
      'expected schedule category_action_resumed audit log',
      harness.categoryAuditLogs
    )

    return buildCaseDetail('schedule', 'confirm_create_and_resume', {
      categoryId: createdCategory.id,
      entryId: savedEntry.id,
      categoryName: savedEntry.categoryName
    })
  } finally {
    harness.restore()
  }
}

async function caseScheduleUpdateCategoryConfirmResume() {
  const harness = await createHarness('task031-schedule-update-confirm')
  try {
    const confirmService = createConfirmService(harness.store)
    const schedule = createScheduleService(harness.store)
    const original = schedule.create({
      title: '带猫打疫苗',
      startAt: '2026-07-04T14:00:00.000Z',
      location: '宠物医院',
      categoryId: 'schedule_general',
      categoryName: '日程',
      sourceText: '带猫打疫苗'
    })

    const pending = confirmService.createPending({
      date: verifyDate,
      conversationMessageId: 'msg-schedule-update-confirm',
      sourceText: '把这个日程改到宠物医疗，没有就新建',
      assistantReply: '小铃湾想先确认是否新增宠物医疗日程类目。',
      toolCalls: [
        {
          tool_name: 'schedule.update',
          arguments: {
            id: original.id,
            needsNewCategory: true,
            proposedCategoryName: '宠物医疗',
            sourceText: '把这个日程改到宠物医疗，没有就新建'
          }
        }
      ],
      confirmRequest: {
        kind: 'category_creation_confirmation',
        toolName: 'schedule.update',
        domain: 'schedule',
        proposedCategoryName: '宠物医疗',
        reason: '当前日程找不到合适分类，建议先新增日程类目，等待主人确认。',
        sourceText: '把这个日程改到宠物医疗，没有就新建',
        pendingAction: {
          toolName: 'schedule.update',
          arguments: {
            id: original.id,
            needsNewCategory: true,
            proposedCategoryName: '宠物医疗',
            sourceText: '把这个日程改到宠物医疗，没有就新建'
          }
        }
      }
    })

    confirmService.approve(pending.id)
    const result = await confirmService.executeApprovedConfirmation(pending.id)
    const resumedResult = result.toolExecution.results.find((item) => item.tool_name === 'schedule.update')
    const savedEntry = getScheduleEntry(harness.store, resumedResult?.result?.id ?? original.id)

    assert(savedEntry?.title === '带猫打疫苗', 'expected schedule.update to preserve original title after confirmation', savedEntry)
    assert(savedEntry?.location === '宠物医院', 'expected schedule.update to preserve original location after confirmation', savedEntry)
    assert(savedEntry?.categoryName === '宠物医疗', 'expected schedule.update remapped to 宠物医疗 after confirmation', savedEntry)
    assert(
      harness.categoryAuditLogs.some(
        (item) => item.eventType === 'category_action_resumed' && item.domain === 'schedule'
      ),
      'expected schedule update resume audit log',
      harness.categoryAuditLogs
    )

    return buildCaseDetail('schedule', 'confirm_update_and_resume', {
      entryId: savedEntry.id,
      title: savedEntry.title,
      categoryName: savedEntry.categoryName
    })
  } finally {
    harness.restore()
  }
}

async function caseTodoRejectNoWrite() {
  const harness = await createHarness('task031-todo-reject')
  try {
    const confirmService = createConfirmService(harness.store)
    const todo = createTodoService(harness.store)
    const beforeCategories = todo.listCategories().length
    const beforeEntries = listTodoEntries(harness.store, { status: 'pending' }).length

    const pending = confirmService.createPending({
      date: verifyDate,
      conversationMessageId: 'msg-todo-reject',
      sourceText: '新增一个给猫洗澡的待办，类目没有就新建宇宙远足',
      assistantReply: '小铃湾想先确认是否新增宇宙远足待办类目。',
      toolCalls: [
        {
          tool_name: 'todo.create',
          arguments: {
            title: '给猫洗澡',
            needsNewCategory: true,
            proposedCategoryName: '宇宙远足',
            sourceText: '新增一个给猫洗澡的待办，类目没有就新建宇宙远足'
          }
        }
      ],
      confirmRequest: {
        kind: 'category_creation_confirmation',
        toolName: 'todo.create',
        domain: 'todo',
        proposedCategoryName: '宇宙远足',
        reason: '当前待办找不到合适分类，建议先新增待办类目，等待主人确认。',
        sourceText: '新增一个给猫洗澡的待办，类目没有就新建宇宙远足',
        pendingAction: {
          toolName: 'todo.create',
          arguments: {
            title: '给猫洗澡',
            needsNewCategory: true,
            proposedCategoryName: '宇宙远足',
            sourceText: '新增一个给猫洗澡的待办，类目没有就新建宇宙远足'
          }
        }
      }
    })

    const rejection = confirmService.rejectConfirmation(pending.id)
    const afterCategories = todo.listCategories().length
    const afterEntries = listTodoEntries(harness.store, { status: 'pending' }).length

    assert(rejection.categoryRejectResolution?.mode === 'closed_without_write', 'expected todo rejection closed_without_write', rejection)
    assert(beforeCategories === afterCategories, 'expected todo category count unchanged after rejection', { beforeCategories, afterCategories })
    assert(beforeEntries === afterEntries, 'expected todo entry count unchanged after rejection', { beforeEntries, afterEntries })

    return buildCaseDetail('todo', 'reject_without_write', {
      categoryCount: afterCategories,
      entryCount: afterEntries
    })
  } finally {
    harness.restore()
  }
}

async function caseScheduleRejectNoWrite() {
  const harness = await createHarness('task031-schedule-reject')
  try {
    const confirmService = createConfirmService(harness.store)
    const schedule = createScheduleService(harness.store)
    const beforeCategories = schedule.listCategories().length
    const beforeEntries = schedule.listToday().length

    const pending = confirmService.createPending({
      date: verifyDate,
      conversationMessageId: 'msg-schedule-reject',
      sourceText: '下周安排给猫修胡子，类目没有就新建银河远征',
      assistantReply: '小铃湾想先确认是否新增银河远征日程类目。',
      toolCalls: [
        {
          tool_name: 'schedule.create',
          arguments: {
            title: '给猫修胡子',
            startAt: '2026-07-05T11:00:00.000Z',
            needsNewCategory: true,
            proposedCategoryName: '银河远征',
            sourceText: '下周安排给猫修胡子，类目没有就新建银河远征'
          }
        }
      ],
      confirmRequest: {
        kind: 'category_creation_confirmation',
        toolName: 'schedule.create',
        domain: 'schedule',
        proposedCategoryName: '银河远征',
        reason: '当前日程找不到合适分类，建议先新增日程类目，等待主人确认。',
        sourceText: '下周安排给猫修胡子，类目没有就新建银河远征',
        pendingAction: {
          toolName: 'schedule.create',
          arguments: {
            title: '给猫修胡子',
            startAt: '2026-07-05T11:00:00.000Z',
            needsNewCategory: true,
            proposedCategoryName: '银河远征',
            sourceText: '下周安排给猫修胡子，类目没有就新建银河远征'
          }
        }
      }
    })

    const rejection = confirmService.rejectConfirmation(pending.id)
    const afterCategories = schedule.listCategories().length
    const afterEntries = schedule.listToday().length

    assert(rejection.categoryRejectResolution?.mode === 'closed_without_write', 'expected schedule rejection closed_without_write', rejection)
    assert(beforeCategories === afterCategories, 'expected schedule category count unchanged after rejection', { beforeCategories, afterCategories })
    assert(beforeEntries === afterEntries, 'expected schedule entry count unchanged after rejection', { beforeEntries, afterEntries })

    return buildCaseDetail('schedule', 'reject_without_write', {
      categoryCount: afterCategories,
      entryCount: afterEntries
    })
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
  ['TC-035 ledger lookup cache reuse', caseLedgerLookupCacheReuse],
  ['TC-035 todo lookup cache reuse', caseTodoLookupCacheReuse],
  ['TC-035 schedule lookup cache reuse', caseScheduleLookupCacheReuse],
  ['TC-036 category domain registry validation', caseCategoryDomainRegistryValidation],
  ['TC-032 todo lookup round limit', caseTodoLookupRoundLimit],
  ['TC-032 schedule lookup round limit', caseScheduleLookupRoundLimit],
  ['TC-003 todo direct hit allow', caseTodoDirectHit],
  ['TC-029 todo update category remap', caseTodoUpdateCategoryRemap],
  ['TC-004 schedule direct hit allow', caseScheduleDirectHit],
  ['TC-030 schedule update category remap', caseScheduleUpdateCategoryRemap],
  ['TC-031 todo create category confirm resume', caseTodoCreateCategoryConfirmResume],
  ['TC-031 todo update category confirm resume', caseTodoUpdateCategoryConfirmResume],
  ['TC-031 schedule create category confirm resume', caseScheduleCreateCategoryConfirmResume],
  ['TC-031 schedule update category confirm resume', caseScheduleUpdateCategoryConfirmResume],
  ['TC-031 todo reject no write', caseTodoRejectNoWrite],
  ['TC-031 schedule reject no write', caseScheduleRejectNoWrite]
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
