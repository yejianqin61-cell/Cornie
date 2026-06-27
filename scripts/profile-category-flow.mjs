import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { openDb } from '../electron/db.js'
import { conversationService } from '../electron/backend/conversation/service.js'
import { createConfirmService } from '../electron/backend/confirm/service.js'
import { registerLedgerTools } from '../electron/backend/ledger/tools.js'
import { registerTodoTools } from '../electron/backend/todo/tools.js'
import { registerScheduleTools } from '../electron/backend/schedule/tools.js'
import { getTool, registerTool } from '../electron/backend/tools/registry.js'
import { cleanupSqliteFile, createRuntimeSqlitePath } from './tmp-artifacts.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const profileDate = '2026-06-27'

process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'profile-key'
process.env.DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://profile.local'
process.env.DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
process.env.DEEPSEEK_TIMEOUT_MS = process.env.DEEPSEEK_TIMEOUT_MS || '3000'

function parseArgs(argv) {
  const options = {
    db: null,
    format: 'json',
    output: null,
    help: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }
    if (arg === '--db' && next) {
      options.db = path.resolve(repoRoot, next)
      index += 1
      continue
    }
    if (arg === '--format' && next) {
      options.format = next
      index += 1
      continue
    }
    if (arg === '--output' && next) {
      options.output = path.resolve(repoRoot, next)
      index += 1
      continue
    }
  }

  return options
}

function printHelp() {
  console.log([
    'Usage: node scripts/profile-category-flow.mjs [options]',
    '',
    'Options:',
    '  --db <path>        SQLite database path used for profiling',
    '  --format <value>   json | markdown',
    '  --output <path>    write result to file',
    '  --help             show this help'
  ].join('\n'))
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
            message: 'tool should be re-registered for profiling'
          }
        })
      })
    }
  }
}

async function createHarness(dbPath) {
  cleanupSqliteFile(dbPath)
  resetRegisteredTools()

  const store = await openDb(dbPath)
  registerLedgerTools(store, { registerTool })
  registerTodoTools(store, { registerTool })
  registerScheduleTools(store, { registerTool })

  return {
    store,
    close() {
      try {
        store.close()
      } catch {}
      cleanupSqliteFile(dbPath)
    }
  }
}

function createScenarioFetchController() {
  let currentScenario = null

  function setScenario(name) {
    currentScenario = name
  }

  async function fetchImpl(url, options = {}) {
    const requestBody = JSON.parse(String(options.body ?? '{}'))
    const messages = Array.isArray(requestBody.messages) ? requestBody.messages : []
    const lastUserMessage = [...messages].reverse().find((item) => item?.role === 'user')
    const content = String(lastUserMessage?.content ?? '')

    let payload = {
      type: 'reply',
      assistant_reply: '小铃湾已经处理好啦。'
    }

    if (content.includes('你上一条回复不符合约定协议')) {
      payload = {
        type: 'reply',
        assistant_reply: '小铃湾修好协议格式啦。'
      }
    } else if (currentScenario === 'direct_hit') {
      if (content.includes('请结合工具执行结果')) {
        payload = {
          type: 'reply',
          assistant_reply: '小铃湾已经帮主人记好了这笔餐饮支出。'
        }
      } else {
        payload = {
          type: 'tool_call',
          assistant_reply: '小铃湾这就帮主人记下来。',
          tool_calls: [
            {
              tool_name: 'ledger.add_expense',
              arguments: {
                amount: 32,
                currency: 'CNY',
                occurredAt: '2026-06-27T12:00:00.000Z',
                categoryName: '餐饮',
                merchant: '食堂',
                item: '午饭',
                sourceText: '今天中午吃饭花了32块'
              }
            }
          ]
        }
      }
    } else if (currentScenario === 'lookup_then_write') {
      if (content.includes('你刚刚完成的是一轮只读补查')) {
        payload = {
          type: 'tool_call',
          assistant_reply: '小铃湾看完类目啦，这次应该可以稳稳记下来了。',
          tool_calls: [
            {
              tool_name: 'ledger.add_expense',
              arguments: {
                amount: 45,
                currency: 'CNY',
                occurredAt: '2026-06-27T18:30:00.000Z',
                categoryName: '餐饮',
                merchant: '面馆',
                item: '晚饭',
                sourceText: '今晚吃面花了45块'
              }
            }
          ]
        }
      } else if (content.includes('请结合工具执行结果')) {
        payload = {
          type: 'reply',
          assistant_reply: '小铃湾已经根据补查结果，把这笔晚饭记到餐饮类啦。'
        }
      } else {
        payload = {
          type: 'tool_call',
          assistant_reply: '小铃湾先去看看现有类目，再回来帮主人记。',
          tool_calls: [
            {
              tool_name: 'ledger_category.list_expense',
              arguments: {
                query: '餐',
                sourceText: '今晚吃面花了45块'
              }
            }
          ]
        }
      }
    } else if (currentScenario === 'confirm_resume') {
      if (content.includes('请结合工具执行结果')) {
        payload = {
          type: 'reply',
          assistant_reply: '小铃湾已经新建好“宠物用品”，也顺手把这笔花销记好了。'
        }
      } else {
        payload = {
          type: 'tool_call',
          assistant_reply: '小铃湾觉得这笔像是新的支出类目，想先问问主人可不可以新增。',
          tool_calls: [
            {
              tool_name: 'ledger.add_expense',
              arguments: {
                amount: 89,
                currency: 'CNY',
                occurredAt: '2026-06-27T21:00:00.000Z',
                merchant: '猫超',
                item: '猫罐头',
                needsNewCategory: true,
                proposedCategoryName: '宠物用品',
                sourceText: '今天给猫买罐头花了89块'
              }
            }
          ]
        }
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
                content: JSON.stringify(payload)
              }
            }
          ]
        }
      },
      async text() {
        return JSON.stringify(payload)
      }
    }
  }

  return {
    setScenario,
    fetchImpl
  }
}

function summarizeScenario(name, telemetry, extra = {}) {
  return {
    scenario: name,
    totalDurationMs: telemetry?.totalDurationMs ?? 0,
    modelCallCount: telemetry?.model?.callCount ?? 0,
    modelDurationMs: telemetry?.model?.totalDurationMs ?? 0,
    maxPromptChars: telemetry?.model?.maxPromptChars ?? 0,
    totalPromptChars: telemetry?.model?.totalPromptChars ?? 0,
    initialPromptChars: telemetry?.prompts?.initialPromptChars ?? 0,
    followupPromptChars: (telemetry?.prompts?.followups ?? []).map((item) => ({
      phase: item.phase,
      promptChars: item.promptChars,
      legacyPromptCharsEstimate: item.legacyPromptCharsEstimate
    })),
    toolRoundCount: telemetry?.tools?.roundCount ?? 0,
    toolCallCount: telemetry?.tools?.toolCallCount ?? 0,
    toolDurationMs: telemetry?.tools?.totalDurationMs ?? 0,
    lookupRoundCount: telemetry?.tools?.lookupRoundCount ?? 0,
    lookupCacheHitCount: telemetry?.tools?.lookupCacheHitCount ?? 0,
    context: telemetry?.context ?? null,
    outcome: telemetry?.outcome ?? null,
    ...extra
  }
}

function buildMarkdown(report) {
  const lines = [
    '# 类目链路 Profiling 报告',
    '',
    `- 生成时间：${report.generatedAt}`,
    `- 数据库：${report.dbPath}`,
    '',
    '## 场景摘要',
    '',
    '| 场景 | 总耗时(ms) | 模型调用数 | 工具轮次 | 最大 Prompt 字符数 | 补查轮次 | 待确认 |',
    '| --- | --- | --- | --- | --- | --- | --- |'
  ]

  for (const scenario of report.scenarios) {
    lines.push(
      `| ${scenario.scenario} | ${scenario.totalDurationMs} | ${scenario.modelCallCount} | ${scenario.toolRoundCount} | ${scenario.maxPromptChars} | ${scenario.lookupRoundCount} | ${scenario.outcome?.pendingConfirmation ? '是' : '否'} |`
    )
  }

  lines.push('', '## 关键观察', '')

  for (const scenario of report.scenarios) {
    lines.push(`### ${scenario.scenario}`)
    lines.push('')
    lines.push(`- 初始 Prompt 长度：${scenario.initialPromptChars}`)
    lines.push(`- 模型总 Prompt 长度：${scenario.totalPromptChars}`)
    lines.push(`- 工具总耗时：${scenario.toolDurationMs}ms`)
    if (scenario.followupPromptChars.length > 0) {
      for (const followup of scenario.followupPromptChars) {
        lines.push(
          `- ${followup.phase}：当前 ${followup.promptChars} chars，旧模板估算 ${followup.legacyPromptCharsEstimate} chars`
        )
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  if (!options.db) {
    options.db = await createRuntimeSqlitePath('profile-category-flow', { keepNameStable: true })
  }

  const harness = await createHarness(options.db)
  const conversation = conversationService(harness.store)
  const confirm = createConfirmService(harness.store)
  const fetchController = createScenarioFetchController()
  const originalFetch = global.fetch
  global.fetch = fetchController.fetchImpl

  try {
    const scenarios = []

    fetchController.setScenario('direct_hit')
    const directHitResult = await conversation.sendMessage({
      date: profileDate,
      message: '今天中午吃饭花了32块'
    })
    scenarios.push(summarizeScenario('direct_hit', directHitResult.telemetry))

    fetchController.setScenario('lookup_then_write')
    const lookupResult = await conversation.sendMessage({
      date: profileDate,
      message: '今晚吃面花了45块'
    })
    scenarios.push(summarizeScenario('lookup_then_write', lookupResult.telemetry))

    fetchController.setScenario('confirm_resume')
    const confirmStartResult = await conversation.sendMessage({
      date: profileDate,
      message: '今天给猫买罐头花了89块'
    })
    const confirmationId = confirmStartResult.pendingConfirmation?.id
    if (!confirmationId) {
      throw new Error('confirm_resume scenario did not create pending confirmation')
    }
    confirm.approve(confirmationId)
    const confirmExecutionResult = await confirm.executeApprovedConfirmation(confirmationId)
    scenarios.push(
      summarizeScenario('confirm_resume_request', confirmStartResult.telemetry, {
        pendingConfirmationId: confirmationId
      })
    )
    scenarios.push(
      summarizeScenario('confirm_resume_execute', confirmExecutionResult.telemetry, {
        executedConfirmationId: confirmationId
      })
    )

    const report = {
      generatedAt: new Date().toISOString(),
      dbPath: options.db,
      scenarios
    }

    const outputText =
      options.format === 'markdown'
        ? buildMarkdown(report)
        : JSON.stringify(report, null, 2)

    if (options.output) {
      fs.writeFileSync(options.output, outputText, 'utf8')
    } else {
      console.log(outputText)
    }
  } finally {
    global.fetch = originalFetch
    harness.close()
  }
}

main()
