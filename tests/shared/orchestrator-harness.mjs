import { createConversationOrchestrator } from '../../electron/backend/agent/orchestrator.js'
import { createServiceHarness, assert } from './service-harness.mjs'

export async function createOrchestratorHarness(caseName) {
  const harness = await createServiceHarness(caseName)

  process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'verify-key'
  process.env.DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://verify.local'
  process.env.DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  return {
    ...harness,
    orchestrator: createConversationOrchestrator(harness.store)
  }
}

export async function withMockedFetch(handler, run) {
  const originalFetch = global.fetch
  global.fetch = handler
  try {
    return await run()
  } finally {
    global.fetch = originalFetch
  }
}

export function buildMockFetch(resolver) {
  return async (_url, options = {}) => {
    const payload = JSON.parse(String(options.body ?? '{}'))
    const content = await resolver(payload)
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          choices: [
            {
              message: {
                content
              }
            }
          ]
        }
      },
      async text() {
        return content
      }
    }
  }
}

export { assert }
