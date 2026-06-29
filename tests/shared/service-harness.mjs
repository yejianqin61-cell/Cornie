import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import { openDb } from '../../electron/db.js'
import { registerLedgerTools } from '../../electron/backend/ledger/tools.js'
import { registerTodoTools } from '../../electron/backend/todo/tools.js'
import { registerScheduleTools } from '../../electron/backend/schedule/tools.js'
import { registerObservationTools } from '../../electron/backend/observation/tools.js'
import { registerSystemTools } from '../../electron/backend/system/tools.js'
import { registerMemoryWikiTools } from '../../electron/backend/memory-wiki/tools.js'
import { clearTools, registerTool } from '../../electron/backend/tools/registry.js'
import { cleanupSqliteFile, createRuntimeSqlitePath } from '../../scripts/tmp-artifacts.mjs'

export function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

export async function createServiceHarness(caseName, options = {}) {
  const dbPath =
    options.dbPath ??
    (await createRuntimeSqlitePath(`service-test-${caseName}-${randomUUID()}`))
  const baseDir =
    options.baseDir ??
    (await fsPromises.mkdtemp(path.join(os.tmpdir(), `cornie-service-test-${caseName}-`)))

  cleanupSqliteFile(dbPath)
  const store = await openDb(dbPath)
  clearTools()

  registerLedgerTools(store, { registerTool })
  registerTodoTools(store, { registerTool })
  registerScheduleTools(store, { registerTool })
  registerObservationTools(store, { registerTool })
  registerSystemTools(store, { registerTool })
  await registerMemoryWikiTools({ baseDir, store }, { registerTool })

  return {
    store,
    baseDir,
    async close() {
      try {
        store.close()
      } catch {}
      cleanupSqliteFile(dbPath)
      await fsPromises.rm(baseDir, { recursive: true, force: true })
    }
  }
}
