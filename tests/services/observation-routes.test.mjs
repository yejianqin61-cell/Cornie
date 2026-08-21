import express from 'express'

import { createServiceHarness, assert } from '../shared/service-harness.mjs'
import { observationRoutes } from '../../electron/backend/observation/routes.js'
import { jsonErrorHandler } from '../../electron/backend/http/middleware.js'

// BE-08：observation 路由 asyncHandler 化 + 参数校验（非法日期 400、合法日期 200）

async function withApi(store, fn) {
  const app = express()
  app.use(express.json())
  app.use('/api', observationRoutes({ store }))
  app.use(jsonErrorHandler)
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const port = server.address().port
  try {
    await fn(`http://127.0.0.1:${port}/api`)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

async function testInvalidDateReturns400() {
  const harness = await createServiceHarness('be08-obs-routes')
  try {
    await withApi(harness.store, async (base) => {
      const res = await fetch(`${base}/observations?date=2026-99-99`)
      assert(res.status === 400, 'expected 400 for fake calendar date', res.status)
      const body = await res.json()
      assert(body.error, 'expected error payload', body)

      const ok = await fetch(`${base}/observations?date=2026-08-21`)
      assert(ok.status === 200, 'expected 200 for valid date', ok.status)
      const okBody = await ok.json()
      assert(Array.isArray(okBody.observations), 'expected observations array', okBody)
    })
  } finally {
    await harness.close()
  }
}

async function testInvalidLimitReturns400() {
  const harness = await createServiceHarness('be08-obs-limit')
  try {
    await withApi(harness.store, async (base) => {
      const res = await fetch(`${base}/observations?limit=abc`)
      assert(res.status === 400, 'expected 400 for invalid limit', res.status)

      const ok = await fetch(`${base}/observations/recall?limit=3`)
      assert(ok.status === 200, 'expected 200 for valid recall limit', ok.status)
    })
  } finally {
    await harness.close()
  }
}

const tests = [
  ['observation routes invalid date -> 400', testInvalidDateReturns400],
  ['observation routes invalid limit -> 400', testInvalidLimitReturns400]
]

let passed = 0

for (const [name, test] of tests) {
  await test()
  passed += 1
  console.log(`PASS services - ${name}`)
}

console.log(`tests/services/observation-routes.test.mjs: passed ${passed}/${tests.length}`)
