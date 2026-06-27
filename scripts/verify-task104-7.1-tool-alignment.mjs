import assert from 'node:assert/strict'
import { execFile as execFileCallback } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { openDb } from '../electron/db.js'
import { registerTool, listTools } from '../electron/backend/tools/registry.js'
import { registerLedgerTools } from '../electron/backend/ledger/tools.js'
import { registerTodoTools } from '../electron/backend/todo/tools.js'
import { registerScheduleTools } from '../electron/backend/schedule/tools.js'
import { registerMemoryWikiTools } from '../electron/backend/memory-wiki/tools.js'

const execFile = promisify(execFileCallback)

const REQUIRED_TOOL_NAMES = [
  'ledger.list_by_category',
  'ledger.list_recent',
  'ledger.list_by_id_batch',
  'ledger_category.get',
  'ledger_category.list_all',
  'ledger_category.restore',
  'todo.reopen',
  'todo.list_open',
  'todo.list_completed',
  'todo_category.get',
  'todo_category.restore',
  'todo_category.reorder',
  'schedule.restore',
  'schedule.list_upcoming',
  'schedule.list_cancelled',
  'schedule_category.get',
  'schedule_category.restore',
  'schedule_category.reorder',
  'memory_wiki.get_versions',
  'memory_wiki.get_version_diff',
  'memory_wiki.list_audit_events',
  'memory_wiki.inspect_broken_links',
  'memory_wiki.inspect_orphan_pages',
  'memory_wiki.delete_page',
  'memory_index.get',
  'memory_index.list',
  'memory_index.merge_topics',
  'memory_index.unlink_page'
]

const REQUIRED_LOW_RISK_TOOLS = [
  'ledger.list_by_category',
  'ledger.list_recent',
  'ledger.list_by_id_batch',
  'ledger_category.get',
  'ledger_category.list_all',
  'todo.list_open',
  'todo.list_completed',
  'todo_category.get',
  'schedule.list_upcoming',
  'schedule.list_cancelled',
  'schedule_category.get',
  'memory_wiki.get_versions',
  'memory_wiki.get_version_diff',
  'memory_wiki.list_audit_events',
  'memory_wiki.inspect_broken_links',
  'memory_wiki.inspect_orphan_pages',
  'memory_index.get',
  'memory_index.list'
]

async function runTaskScript(taskName) {
  const { stdout, stderr } = await execFile('cmd.exe', ['/c', 'npm.cmd', 'run', taskName], {
    cwd: process.cwd(),
    windowsHide: true
  })
  return { stdout, stderr }
}

async function main() {
  const subtasks = [
    'verify:task098',
    'verify:task099',
    'verify:task100',
    'verify:task101',
    'verify:task102',
    'verify:task103'
  ]

  for (const taskName of subtasks) {
    await runTaskScript(taskName)
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-7-1-104-'))
  const dbPath = path.join(tempRoot, 'task104.sqlite')
  const store = await openDb(dbPath)

  try {
    registerLedgerTools(store, { registerTool })
    registerTodoTools(store, { registerTool })
    registerScheduleTools(store, { registerTool })
    await registerMemoryWikiTools({ baseDir: tempRoot, store }, { registerTool })

    const tools = listTools()
    const toolMap = new Map(tools.map((item) => [item.name, item]))

    for (const toolName of REQUIRED_TOOL_NAMES) {
      assert.ok(toolMap.has(toolName), `expected required 7.1 tool registered: ${toolName}`)
    }

    for (const toolName of REQUIRED_LOW_RISK_TOOLS) {
      assert.equal(toolMap.get(toolName)?.riskLevel, 'low', `expected low risk tool: ${toolName}`)
    }

    console.log('verify-task104-7.1-tool-alignment: passed')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error('verify-task104-7.1-tool-alignment: failed')
  console.error(error?.message ?? error)
  process.exit(1)
})
