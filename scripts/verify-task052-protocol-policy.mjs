import fs from 'node:fs'
import { randomUUID } from 'node:crypto'

import { openDb } from '../electron/db.js'
import { buildJsonRepairPrompt, parseModelJson } from '../electron/backend/agent/jsonProtocol.js'
import { registerLedgerTools } from '../electron/backend/ledger/tools.js'
import { registerTodoTools } from '../electron/backend/todo/tools.js'
import { registerScheduleTools } from '../electron/backend/schedule/tools.js'
import { registerMemoryTools } from '../electron/backend/memory/tools.js'
import { registerSystemTools } from '../electron/backend/system/tools.js'
import { evaluateToolCalls } from '../electron/backend/policy/toolPolicy.js'
import { registerTool } from '../electron/backend/tools/registry.js'

function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

function cleanupDbFile(dbPath) {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath)
  }
}

async function createStore(caseName) {
  const dbPath = `./tmp-task052-${caseName}-${randomUUID()}.sqlite`
  cleanupDbFile(dbPath)
  const store = await openDb(dbPath)
  registerLedgerTools(store, { registerTool })
  registerTodoTools(store, { registerTool })
  registerScheduleTools(store, { registerTool })
  registerMemoryTools(store, { registerTool })
  registerSystemTools(store, { registerTool })

  return {
    store,
    dbPath,
    close() {
      try {
        store.close()
      } catch {}
      cleanupDbFile(dbPath)
    }
  }
}

function expectThrow(fn, messageFragment) {
  try {
    fn()
  } catch (error) {
    assert(
      String(error?.message ?? '').includes(messageFragment),
      `expected error message to include "${messageFragment}"`,
      { actual: error?.message }
    )
    return error
  }
  throw new Error(`expected function to throw: ${messageFragment}`)
}

function testParseReplyEnvelope() {
  const parsed = parseModelJson(
    JSON.stringify({
      type: 'reply',
      assistant_reply: '小铃湾记住啦。'
    })
  )

  assert(parsed.type === 'reply', 'expected reply envelope', parsed)
  assert(parsed.assistant_reply === '小铃湾记住啦。', 'expected assistant reply', parsed)
}

function testParseCodeBlockToolCall() {
  const parsed = parseModelJson(`
\`\`\`json
{
  "type": "tool_call",
  "assistant_reply": "我先帮主人查一下。",
  "tool_calls": [
    {
      "tool_name": "todo.list_today",
      "arguments": {}
    }
  ]
}
\`\`\`
  `)

  assert(parsed.type === 'tool_call', 'expected tool_call envelope', parsed)
  assert(parsed.tool_calls.length === 1, 'expected one tool call', parsed)
  assert(parsed.tool_calls[0].tool_name === 'todo.list_today', 'expected todo.list_today', parsed)
}

function testParseBalancedJson() {
  const parsed = parseModelJson(`
前面这些字都应该被忽略
{"type":"tool_result","results":[{"tool_name":"todo.list_today","ok":true,"result":{"items":[]}}]}
后面这些字也应该被忽略
  `)

  assert(parsed.type === 'tool_result', 'expected tool_result envelope', parsed)
  assert(parsed.results.length === 1, 'expected one tool result', parsed)
  assert(parsed.results[0].ok === true, 'expected ok=true', parsed)
}

function testCategoryArgumentValidation() {
  expectThrow(
    () =>
      parseModelJson(
        JSON.stringify({
          type: 'tool_call',
          assistant_reply: '我来处理这笔账目。',
          tool_calls: [
            {
              tool_name: 'ledger.update_entry',
              arguments: {
                id: 'entry-1',
                categoryName: '购物',
                needsNewCategory: true,
                proposedCategoryName: '猫咪用品'
              }
            }
          ]
        })
      ),
    'failed to parse model JSON protocol'
  )

  expectThrow(
    () =>
      parseModelJson(
        JSON.stringify({
          type: 'tool_call',
          assistant_reply: '我来处理这笔账目。',
          tool_calls: [
            {
              tool_name: 'schedule.create',
              arguments: {
                title: '带猫复查',
                startAt: '2026-07-01T10:00:00.000Z',
                needsNewCategory: true
              }
            }
          ]
        })
      ),
    'failed to parse model JSON protocol'
  )
}

function testRepairPrompt() {
  const prompt = buildJsonRepairPrompt('not-json')
  assert(prompt.includes('reply'), 'expected repair prompt mention reply type', prompt)
  assert(prompt.includes('tool_call'), 'expected repair prompt mention tool_call type', prompt)
  assert(prompt.includes('not-json'), 'expected repair prompt include raw text', prompt)
}

async function testPolicyAllowSystemRead() {
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

async function testPolicyConfirmMemoryWrite() {
  const harness = await createStore('confirm-memory')
  try {
    const decision = evaluateToolCalls(
      [
        {
          tool_name: 'memory.create',
          arguments: {
            kind: 'preference',
            title: '喜欢猫咪',
            content: '主人明显表达喜欢猫咪。'
          }
        }
      ],
      {
        sourceText: '我很喜欢猫咪',
        store: harness.store
      }
    )

    assert(decision.decision === 'confirm', 'expected confirm decision', decision)
    assert(
      decision.confirmRequest?.toolName === 'memory.create',
      'expected memory.create confirm request',
      decision
    )
  } finally {
    harness.close()
  }
}

async function testPolicyAskBackMissingLedgerAmount() {
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

async function testPolicyDenyUnknownTool() {
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

async function testPolicyConfirmHighRiskLedgerDelete() {
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

const tests = [
  ['protocol reply envelope', testParseReplyEnvelope],
  ['protocol code block tool_call', testParseCodeBlockToolCall],
  ['protocol balanced json tool_result', testParseBalancedJson],
  ['protocol category argument validation', testCategoryArgumentValidation],
  ['protocol repair prompt', testRepairPrompt],
  ['policy allow system read', testPolicyAllowSystemRead],
  ['policy confirm memory write', testPolicyConfirmMemoryWrite],
  ['policy ask_back missing ledger amount', testPolicyAskBackMissingLedgerAmount],
  ['policy deny unknown tool', testPolicyDenyUnknownTool],
  ['policy confirm high risk ledger delete', testPolicyConfirmHighRiskLedgerDelete]
]

async function main() {
  let passed = 0

  for (const [name, test] of tests) {
    await test()
    passed += 1
    console.log(`PASS task052 - ${name}`)
  }

  console.log(`verify-task052-protocol-policy: passed ${passed}/${tests.length}`)
}

main().catch((error) => {
  console.error('verify-task052-protocol-policy: failed')
  console.error(error?.message ?? error)
  if (error?.details !== undefined) {
    console.error(JSON.stringify(error.details, null, 2))
  }
  process.exit(1)
})
