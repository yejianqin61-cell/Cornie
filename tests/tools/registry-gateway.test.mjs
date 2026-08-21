import { randomUUID } from 'node:crypto'

import { openDb } from '../../electron/db.js'
import { executeToolCalls } from '../../electron/backend/tools/gateway.js'
import { getTool, listTools, registerTool, clearTools } from '../../electron/backend/tools/registry.js'
import { getToolRiskLevel } from '../../electron/backend/policy/riskLevels.js'
import { registerSystemTools } from '../../electron/backend/system/tools.js'
import { registerTodoTools } from '../../electron/backend/todo/tools.js'
import { registerScheduleTools } from '../../electron/backend/schedule/tools.js'
import { assert } from '../shared/service-harness.mjs'
import { cleanupSqliteFile, createRuntimeSqlitePath } from '../../scripts/tmp-artifacts.mjs'

async function withStore(caseName, run) {
  const dbPath = await createRuntimeSqlitePath(`tools-test-${caseName}-${randomUUID()}`)
  const store = await openDb(dbPath)
  clearTools() // 每个用例独立 registry（BE-08 重名检测要求）
  try {
    return await run(store)
  } finally {
    try {
      store.close()
    } catch {}
    cleanupSqliteFile(dbPath)
  }
}

async function testRegistryAndRiskLevels() {
  await withStore('registry-risk', async (store) => {
    registerSystemTools(store, { registerTool })
    registerTodoTools(store, { registerTool })
    registerScheduleTools(store, { registerTool })

    const runtimeContext = getTool('settings.get_runtime_context')
    const todoCreate = getTool('todo.create')
    const scheduleDelete = getTool('schedule.delete')

    assert(runtimeContext?.riskLevel === 'low', 'expected runtime context risk level low', runtimeContext)
    assert(todoCreate?.riskLevel === 'medium', 'expected todo.create risk level medium', todoCreate)
    assert(scheduleDelete?.riskLevel === 'high', 'expected schedule.delete risk level high', scheduleDelete)

    const listed = listTools()
    assert(listed.some((item) => item.name === 'settings.get_runtime_context'), 'expected system tool listed', listed)
    assert(listed.every((item) => typeof item.handler === 'undefined'), 'expected listTools hide handler', listed)

    assert(getToolRiskLevel('settings.get_runtime_context') === 'low', 'expected registered low risk')
    assert(getToolRiskLevel('todo.create') === 'medium', 'expected registered medium risk')
    assert(getToolRiskLevel('schedule.delete') === 'high', 'expected registered high risk')
    assert(getToolRiskLevel('memory.create') === 'high', 'expected inferred memory risk high')
  })
}

async function testGatewaySuccessAndResultWrapping() {
  await withStore('gateway-success', async (store) => {
    registerSystemTools(store, { registerTool })

    const result = await executeToolCalls(
      [
        {
          tool_name: 'settings.get_runtime_context',
          arguments: {}
        }
      ],
      { store, source: 'test' }
    )

    assert(result.type === 'tool_result', 'expected tool_result envelope', result)
    assert(result.results.length === 1, 'expected one result', result)
    assert(result.results[0].tool_name === 'settings.get_runtime_context', 'expected wrapped tool name', result)
    assert(result.results[0].ok === true, 'expected successful result', result)
    assert(result.results[0].result?.provider === 'deepseek', 'expected runtime provider in result', result)
    assert(result.results[0].error === null, 'expected null error on success', result)
  })
}

async function testGatewayToolNotFound() {
  const result = await executeToolCalls([
    {
      tool_name: 'tool.that_does_not_exist',
      arguments: {}
    }
  ])

  assert(result.results.length === 1, 'expected one missing-tool result', result)
  assert(result.results[0].ok === false, 'expected missing tool to fail', result)
  assert(result.results[0].error?.code === 'tool_not_found', 'expected tool_not_found code', result)
}

async function testGatewayHandlerFailureWrapping() {
  const toolName = `test.fail.${randomUUID()}`
  registerTool({
    name: toolName,
    description: 'test failing tool',
    riskLevel: 'high',
    async handler() {
      const error = new Error('boom')
      error.code = 'test_failure'
      throw error
    }
  })

  const result = await executeToolCalls([
    {
      tool_name: toolName,
      arguments: {}
    }
  ])

  assert(result.results.length === 1, 'expected one failed result', result)
  assert(result.results[0].ok === false, 'expected wrapped failure', result)
  assert(result.results[0].error?.code === 'test_failure', 'expected custom failure code preserved', result)
  assert(result.results[0].error?.message === 'boom', 'expected failure message preserved', result)
}

// BE-08：重名注册必须抛错（不静默覆盖）
async function testDuplicateRegistrationThrows() {
  const toolName = `test.dupe.${randomUUID()}`
  registerTool({ name: toolName, description: 'first definition', riskLevel: 'low', handler: () => null })
  let threw = false
  try {
    registerTool({ name: toolName, description: 'second definition', riskLevel: 'low', handler: () => null })
  } catch (error) {
    threw = true
    assert(String(error.message).includes('duplicate tool registration'), 'expected duplicate message', error.message)
    assert(String(error.message).includes(toolName), 'expected tool name in message', error.message)
  }
  assert(threw === true, 'expected duplicate registration to throw')
}

const tests = [
  ['registry and risk levels', testRegistryAndRiskLevels],
  ['gateway success and result wrapping', testGatewaySuccessAndResultWrapping],
  ['gateway tool not found', testGatewayToolNotFound],
  ['gateway handler failure wrapping', testGatewayHandlerFailureWrapping],
  ['duplicate tool registration throws', testDuplicateRegistrationThrows]
]

let passed = 0

for (const [name, test] of tests) {
  await test()
  passed += 1
  console.log(`PASS tools - ${name}`)
}

console.log(`tests/tools/registry-gateway.test.mjs: passed ${passed}/${tests.length}`)
