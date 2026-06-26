import { randomUUID } from 'node:crypto'
import { openDb } from '../electron/db.js'
import { registerTool, getTool } from '../electron/backend/tools/registry.js'
import { registerSystemTools } from '../electron/backend/system/tools.js'

function assert(condition, message, details) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

async function main() {
  const dbPath = `./tmp-task049-verify-${randomUUID()}.sqlite`
  const store = await openDb(dbPath)

  try {
    registerSystemTools(store, { registerTool })

    const runtimeContext = getTool('settings.get_runtime_context')
    const modelStatus = getTool('health.get_model_status')

    assert(runtimeContext && modelStatus, 'missing task049 tools')

    const runtimeResult = (await runtimeContext.handler({})).result
    assert(runtimeResult?.provider === 'deepseek', 'expected deepseek runtime provider', runtimeResult)
    assert(runtimeResult?.capabilities?.toolCalling === true, 'expected toolCalling capability', runtimeResult)

    const modelResult = (await modelStatus.handler({})).result
    assert(modelResult?.provider === 'deepseek', 'expected deepseek model provider', modelResult)
    assert(typeof modelResult?.configured === 'boolean', 'expected configured boolean', modelResult)

    console.log('verify-task049-tools: passed')
  } finally {
    try {
      store.close()
    } catch {}
  }
}

main().catch((error) => {
  console.error('verify-task049-tools: failed')
  console.error(error?.message ?? error)
  if (error?.details !== undefined) {
    console.error(JSON.stringify(error.details, null, 2))
  }
  process.exit(1)
})
