import { randomUUID } from 'node:crypto'
import { openDb } from '../electron/db.js'
import { registerTool, getTool } from '../electron/backend/tools/registry.js'
import { registerLedgerTools } from '../electron/backend/ledger/tools.js'
import { registerTodoTools } from '../electron/backend/todo/tools.js'
import { registerScheduleTools } from '../electron/backend/schedule/tools.js'
import { registerSystemTools } from '../electron/backend/system/tools.js'
import { parseModelJson } from '../electron/backend/agent/jsonProtocol.js'
import { evaluateToolRule } from '../electron/backend/policy/rules.js'
import { getToolRiskLevel } from '../electron/backend/policy/riskLevels.js'

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

async function main() {
  const dbPath = `./tmp-task050-verify-${randomUUID()}.sqlite`
  const store = await openDb(dbPath)

  try {
    registerLedgerTools(store, { registerTool })
    registerTodoTools(store, { registerTool })
    registerScheduleTools(store, { registerTool })
    registerSystemTools(store, { registerTool })

    assert(getTool('ledger.update_entry'), 'expected ledger.update_entry registered')
    assert(getTool('todo_category.delete'), 'expected todo_category.delete registered')
    assert(getTool('schedule_category.delete'), 'expected schedule_category.delete registered')
    assert(getTool('settings.get_runtime_context'), 'expected settings tool registered')
    assert(getTool('health.get_model_status'), 'expected health tool registered')

    const parsed = parseModelJson(
      JSON.stringify({
        type: 'tool_call',
        assistant_reply: '帮主人更新这笔账目',
        tool_calls: [
          {
            tool_name: 'ledger.update_entry',
            arguments: {
              id: 'entry-1',
              amount: 128,
              categoryName: '购物',
              sourceText: '把刚才那笔猫粮改成128块，还是购物类'
            }
          }
        ]
      })
    )
    assert(parsed.tool_calls[0].tool_name === 'ledger.update_entry', 'expected parsed ledger.update_entry', parsed)

    const systemDecision = evaluateToolRule(
      {
        tool_name: 'settings.get_runtime_context',
        arguments: {}
      },
      '我想看一下当前运行环境',
      { store }
    )
    assert(systemDecision.decision === 'allow', 'expected settings tool allow', systemDecision)

    const todoDeleteRisk = getToolRiskLevel('todo_category.delete')
    assert(todoDeleteRisk === 'high', 'expected todo_category.delete high risk', todoDeleteRisk)

    const healthRisk = getToolRiskLevel('health.get_model_status')
    assert(healthRisk === 'low', 'expected health.get_model_status low risk', healthRisk)

    console.log('verify-task050-policy: passed')
  } finally {
    try {
      store.close()
    } catch {}
  }
}

main().catch((error) => {
  console.error('verify-task050-policy: failed')
  console.error(error?.message ?? error)
  if (error?.details !== undefined) {
    console.error(JSON.stringify(error.details, null, 2))
  }
  process.exit(1)
})
