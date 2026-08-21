import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import { openDb } from '../electron/db.js'
import { listTools } from '../electron/backend/tools/registry.js'
import { evaluateToolCalls } from '../electron/backend/policy/toolPolicy.js'
import { createServer } from '../electron/server.js'
import { createRuntimeSqlitePath, cleanupSqliteFile } from './tmp-artifacts.mjs'

function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const dbPath = await createRuntimeSqlitePath(`verify450-${randomUUID()}`)
  cleanupSqliteFile(dbPath)
  const store = await openDb(dbPath)
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cornie-verify450-'))

  try {
    // 1) server 接线：createServer 异步注册记忆工具，轮询等待注册完成
    createServer({ store, baseDir })
    let found = null
    for (let i = 0; i < 40; i += 1) {
      const memoryTools = listTools().filter((tool) => tool.name.startsWith('memory_wiki.'))
      if (memoryTools.length > 0) {
        found = memoryTools
        break
      }
      await sleep(50)
    }
    assert(Array.isArray(found) && found.length > 0, 'createServer 后注册表应含 memory_wiki.* 工具')
    const names = found.map((tool) => tool.name)
    assert(names.includes('memory_wiki.get_page'), '应含 memory_wiki.get_page')
    assert(names.includes('memory_wiki.list_pages'), '应含 memory_wiki.list_pages')
    assert(names.includes('memory_wiki.create_page'), '应含 memory_wiki.create_page')
    assert(
      listTools().some((tool) => tool.name.startsWith('memory_governance.')),
      '应含 memory_governance.* 工具'
    )

    // 2) policy 可达性：只读 allow、写入 confirm
    const allowDecision = evaluateToolCalls(
      [{ tool_name: 'memory_wiki.get_page', arguments: { pageId: 'x' } }],
      { sourceText: '测试只读' }
    )
    assert(allowDecision.decision === 'allow', 'memory_wiki.get_page 应 allow', allowDecision)

    const confirmDecision = evaluateToolCalls(
      [{ tool_name: 'memory_wiki.create_page', arguments: { pageType: 'event', title: 't' } }],
      { sourceText: '测试写入' }
    )
    assert(confirmDecision.decision === 'confirm', 'memory_wiki.create_page 应 confirm', confirmDecision)

    console.log('verify-task450-memory-tools-registered: ok')
  } finally {
    try {
      store.close()
    } catch {}
    cleanupSqliteFile(dbPath)
    fs.rmSync(baseDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
