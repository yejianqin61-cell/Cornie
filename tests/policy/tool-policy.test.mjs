import fs from 'node:fs'
import { randomUUID } from 'node:crypto'

import { openDb } from '../../electron/db.js'
import { evaluateToolCalls } from '../../electron/backend/policy/toolPolicy.js'
import { registerLedgerTools } from '../../electron/backend/ledger/tools.js'
import { registerTodoTools } from '../../electron/backend/todo/tools.js'
import { registerScheduleTools } from '../../electron/backend/schedule/tools.js'
import { registerSystemTools } from '../../electron/backend/system/tools.js'
import { registerMemoryWikiTools } from '../../electron/backend/memory-wiki/tools.js'
import { registerTool } from '../../electron/backend/tools/registry.js'
import { cleanupSqliteFile, createRuntimeSqlitePath, createRuntimeTempDir } from '../../scripts/tmp-artifacts.mjs'

function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

async function createStore(caseName) {
  const dbPath = await createRuntimeSqlitePath(`policy-test-${caseName}-${randomUUID()}`)
  const baseDir = await createRuntimeTempDir(`policy-test-${caseName}-${randomUUID()}`)
  cleanupSqliteFile(dbPath)
  const store = await openDb(dbPath)
  registerLedgerTools(store, { registerTool })
  registerTodoTools(store, { registerTool })
  registerScheduleTools(store, { registerTool })
  registerSystemTools(store, { registerTool })
  await registerMemoryWikiTools({ baseDir, store }, { registerTool })

  return {
    store,
    close() {
      try {
        store.close()
      } catch {}
      cleanupSqliteFile(dbPath)
      fs.rmSync(baseDir, { recursive: true, force: true })
    }
  }
}

async function testAllowSystemRead() {
  const harness = await createStore('allow-system-read')
  try {
    const decision = evaluateToolCalls(
      [
        {
          tool_name: 'settings.get_runtime_context',
          arguments: {}
        }
      ],
      {
        sourceText: '看一下当前运行环境',
        store: harness.store
      }
    )

    assert(decision.decision === 'allow', 'expected allow decision', decision)
    assert(decision.toolCalls[0].tool_name === 'settings.get_runtime_context', 'expected same tool', decision)
  } finally {
    harness.close()
  }
}

async function testAskBackMissingLedgerAmount() {
  const harness = await createStore('ask-back-ledger')
  try {
    const decision = evaluateToolCalls(
      [
        {
          tool_name: 'ledger.add_expense',
          arguments: {
            categoryName: '餐饮',
            sourceText: '今天午饭记一下'
          }
        }
      ],
      {
        sourceText: '今天午饭记一下',
        store: harness.store
      }
    )

    assert(decision.decision === 'ask_back', 'expected ask_back decision', decision)
    assert(String(decision.question ?? '').includes('金额'), 'expected ask_back mention amount', decision)
  } finally {
    harness.close()
  }
}

async function testDenyUnknownTool() {
  const harness = await createStore('deny-unknown-tool')
  try {
    const decision = evaluateToolCalls(
      [
        {
          tool_name: 'magic.cast_spell',
          arguments: {}
        }
      ],
      {
        sourceText: '施个法',
        store: harness.store
      }
    )

    assert(decision.decision === 'deny', 'expected deny decision', decision)
    assert(String(decision.reason ?? '').includes('尚未接入'), 'expected deny reason mention not integrated', decision)
  } finally {
    harness.close()
  }
}

async function testConfirmMemoryWikiGovernance() {
  const harness = await createStore('confirm-memory-wiki')
  try {
    const decision = evaluateToolCalls(
      [
        {
          tool_name: 'memory_wiki.merge_pages',
          arguments: {
            targetPageId: 'page-lobster',
            sourcePageId: 'page-seafood'
          }
        }
      ],
      {
        sourceText: '把这两个记忆页面合并一下',
        store: harness.store
      }
    )

    assert(decision.decision === 'confirm', 'expected confirm decision', decision)
    assert(
      decision.confirmRequest?.toolName === 'memory_wiki.merge_pages',
      'expected memory_wiki.merge_pages confirm request',
      decision
    )
  } finally {
    harness.close()
  }
}

async function testConfirmHighRiskLedgerDelete() {
  const harness = await createStore('confirm-high-risk')
  try {
    const decision = evaluateToolCalls(
      [
        {
          tool_name: 'ledger.delete_entry',
          arguments: {
            id: 'ledger-entry-1'
          }
        }
      ],
      {
        sourceText: '把这笔账删掉',
        store: harness.store
      }
    )

    assert(decision.decision === 'confirm', 'expected confirm decision', decision)
    assert(
      decision.confirmRequest?.toolName === 'ledger.delete_entry',
      'expected ledger.delete_entry confirm request',
      decision
    )
  } finally {
    harness.close()
  }
}

// BE-02：ledger.update_entry 补注册后走类目域处理（缺类目 → 追问/建类目语义），而非仅泛化高风险确认
async function testUpdateEntryCategoryDomainBehavior() {
  const harness = await createStore('be02-update-entry-domain')
  try {
    const decision = evaluateToolCalls(
      [
        {
          tool_name: 'ledger.update_entry',
          arguments: {
            id: 'ledger-entry-1',
            amount: 88
          }
        }
      ],
      {
        sourceText: '把昨天那笔改成88块',
        store: harness.store
      }
    )

    // 类目域规则应给出类目相关的 ask_back/confirm（missingReason 类目缺失），而非 allow 或泛化确认
    assert(
      decision.decision === 'ask_back' || decision.decision === 'confirm',
      'expected category-domain decision for update_entry',
      decision
    )
    assert(
      /类目|分类/.test(String(decision.question || decision.reason || decision.confirmRequest?.reason || '')),
      'expected category-related message for update_entry',
      decision
    )
  } finally {
    harness.close()
  }
}

const tests = [
  ['allow system read', testAllowSystemRead],
  ['ask_back missing ledger amount', testAskBackMissingLedgerAmount],
  ['deny unknown tool', testDenyUnknownTool],
  ['confirm memory wiki governance', testConfirmMemoryWikiGovernance],
  ['confirm high risk ledger delete', testConfirmHighRiskLedgerDelete],
  ['update_entry category domain behavior', testUpdateEntryCategoryDomainBehavior]
]

let passed = 0

for (const [name, test] of tests) {
  await test()
  passed += 1
  console.log(`PASS policy - ${name}`)
}

console.log(`tests/policy/tool-policy.test.mjs: passed ${passed}/${tests.length}`)
