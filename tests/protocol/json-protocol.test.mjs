import { buildJsonRepairPrompt, parseModelJson } from '../../electron/backend/agent/jsonProtocol.js'

function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
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
    return
  }

  throw new Error(`expected function to throw: ${messageFragment}`)
}

function testReplyEnvelope() {
  const parsed = parseModelJson(
    JSON.stringify({
      type: 'reply',
      assistant_reply: '小铃湾记住啦。'
    })
  )

  assert(parsed.type === 'reply', 'expected reply envelope', parsed)
  assert(parsed.assistant_reply === '小铃湾记住啦。', 'expected trimmed assistant reply', parsed)
}

function testToolCallEnvelopeInCodeBlock() {
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
  assert(parsed.tool_calls[0].tool_name === 'todo.list_today', 'expected normalized tool name', parsed)
}

function testBalancedJsonExtraction() {
  const parsed = parseModelJson(`
前面这些字都应该被忽略
{"type":"tool_result","results":[{"tool_name":"todo.list_today","ok":true,"result":{"items":[]}}]}
后面这些字也应该被忽略
`)

  assert(parsed.type === 'tool_result', 'expected tool_result envelope', parsed)
  assert(parsed.results.length === 1, 'expected one tool result', parsed)
  assert(parsed.results[0].ok === true, 'expected ok=true', parsed)
}

function testCategoryMappingValidationFailure() {
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
}

function testMissingToolCallsFailure() {
  expectThrow(
    () =>
      parseModelJson(
        JSON.stringify({
          type: 'tool_call',
          assistant_reply: '我先继续处理。'
        })
      ),
    'failed to parse model JSON protocol'
  )
}

function testRepairPromptContents() {
  const prompt = buildJsonRepairPrompt('not-json')

  assert(prompt.includes('reply'), 'expected repair prompt mention reply type', prompt)
  assert(prompt.includes('tool_call'), 'expected repair prompt mention tool_call type', prompt)
  assert(prompt.includes('not-json'), 'expected repair prompt include raw text', prompt)
}

const tests = [
  ['reply envelope', testReplyEnvelope],
  ['tool_call code block parsing', testToolCallEnvelopeInCodeBlock],
  ['balanced json extraction', testBalancedJsonExtraction],
  ['category mapping validation failure', testCategoryMappingValidationFailure],
  ['missing tool_calls failure', testMissingToolCallsFailure],
  ['repair prompt contents', testRepairPromptContents]
]

let passed = 0

for (const [name, test] of tests) {
  test()
  passed += 1
  console.log(`PASS protocol - ${name}`)
}

console.log(`tests/protocol/json-protocol.test.mjs: passed ${passed}/${tests.length}`)
