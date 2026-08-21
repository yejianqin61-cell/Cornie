import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { assert } = await import('../shared/service-harness.mjs')

// BE-05：telemetry 可观测化测试。TELEMETRY_ROOT 在模块加载时确定，需先设环境变量再动态 import。
const telemetryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cornie-telemetry-'))
process.env.CORNIE_TELEMETRY_DIR = telemetryDir

const {
  appendTelemetryRecord,
  dateKey,
  listTelemetryRecords
} = await import('../../electron/backend/agent/telemetryStore.js')
const {
  classifyModelError,
  createTurnTelemetry,
  finalizeTurnTelemetry,
  recordModelFailureTelemetry
} = await import('../../electron/backend/agent/metrics.js')

function testClassifyModelError() {
  assert(classifyModelError({ kind: 'timeout' }).status === 'timeout', 'timeout kind classified')
  assert(classifyModelError(new TypeError('fetch failed')).status === 'network_error', 'TypeError is network')
  assert(classifyModelError({ code: 'invalid_model_protocol' }).status === 'protocol_failed', 'protocol code classified')
  assert(classifyModelError({ name: 'AbortError' }).status === 'aborted', 'AbortError classified')
  assert(classifyModelError(new Error('boom')).status === 'network_error', 'unknown falls back to network')
}

function testFailureTelemetryClassification() {
  const telemetry = createTurnTelemetry({ source: 'chat', date: '2026-08-21', message: 'hi' })
  recordModelFailureTelemetry(telemetry, { phase: 'conversation', error: { kind: 'timeout' } })

  assert(telemetry.model.callCount === 1, 'expected callCount incremented on failure', telemetry.model)
  assert(telemetry.model.calls[0].error === 'timeout', 'expected error classification recorded', telemetry.model.calls[0])
  assert(telemetry.model.calls[0].errorCode === 'timeout', 'expected errorCode recorded')

  const finalized = finalizeTurnTelemetry(telemetry, { finalReply: 'fallback' })
  assert(finalized.outcome.status === 'timeout', 'expected outcome.status timeout', finalized.outcome)
  assert(finalized.outcome.errorCode === 'timeout', 'expected outcome.errorCode', finalized.outcome)
}

function testTelemetryStoreRoundtrip() {
  const date = '2026-08-21'
  const record = { source: 'chat', date, model: { callCount: 1 }, outcome: { status: 'ok' } }
  const ok = appendTelemetryRecord(record, { date })
  assert(ok === true, 'expected append success')

  const file = path.join(telemetryDir, `${dateKey(new Date('2026-08-21T00:00:00'))}.jsonl`)
  assert(fs.existsSync(file), 'expected jsonl file created', file)

  const records = listTelemetryRecords({ date })
  assert(records.length === 1, 'expected 1 record', records)
  assert(records[0].outcome.status === 'ok', 'expected record content preserved')

  const empty = listTelemetryRecords({ date: '2099-01-01' })
  assert(empty.length === 0, 'expected empty list for missing date')
}

try {
  testClassifyModelError()
  console.log('PASS telemetry - classify model error')
  testFailureTelemetryClassification()
  console.log('PASS telemetry - failure classification recorded in telemetry')
  testTelemetryStoreRoundtrip()
  console.log('PASS telemetry - jsonl append/list roundtrip')
  console.log('tests/services/telemetry-store.test.mjs: passed 3/3')
} finally {
  fs.rmSync(telemetryDir, { recursive: true, force: true })
}
