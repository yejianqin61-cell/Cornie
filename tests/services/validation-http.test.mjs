import { createServiceHarness, assert } from '../shared/service-harness.mjs'
import { createLedgerService } from '../../electron/backend/ledger/service.js'
import { createTodoService } from '../../electron/backend/todo/service.js'
import { createScheduleService } from '../../electron/backend/schedule/service.js'
import { requireISODate, optionalISOMonth } from '../../electron/backend/validators.js'

function expectHttpError(fn, status, code) {
  try {
    fn()
    throw new Error('expected function to throw')
  } catch (error) {
    assert(error?.status === status, `expected HttpError status ${status}`, error)
    if (code !== undefined) {
      assert(error?.code === code, `expected error code ${code}`, error)
    }
    return error
  }
}

async function testLedgerAmountBadRequest() {
  const harness = await createServiceHarness('be03-ledger-400')
  try {
    const ledger = createLedgerService(harness.store)
    expectHttpError(() => ledger.addExpense({ item: '晚饭', categoryName: '餐饮' }), 400, 'amount_required')
    expectHttpError(() => ledger.updateEntry({}), 400, 'entry_id_required')
    expectHttpError(() => ledger.deleteEntry({ id: 'missing-id' }), 404)
  } finally {
    await harness.close()
  }
}

async function testTodoAndScheduleBadRequest() {
  const harness = await createServiceHarness('be03-todo-400')
  try {
    const todo = createTodoService(harness.store)
    expectHttpError(() => todo.create({ categoryId: null }), 400, 'title_required')
    expectHttpError(() => todo.update({}), 400, 'entry_id_required')
    expectHttpError(() => todo.update({ id: 'missing' }), 404)

    const schedule = createScheduleService(harness.store)
    expectHttpError(() => schedule.create({ title: '开会' }), 400, 'start_at_required')
    expectHttpError(() => schedule.update({}), 400, 'entry_id_required')
    expectHttpError(() => schedule.update({ id: 'missing' }), 404)
  } finally {
    await harness.close()
  }
}

async function testDateValidatorRejectsFakeDates() {
  // 正则可通过但日期不真实的输入必须被拒绝
  expectHttpError(() => requireISODate('2026-99-99'), 400)
  expectHttpError(() => requireISODate('2026-02-30'), 400)
  expectHttpError(() => requireISODate('2026-13-01'), 400)
  expectHttpError(() => optionalISOMonth('2026-13'), 400)
  // 合法输入放行
  const ok = requireISODate('2026-08-21')
  assert(ok === '2026-08-21', 'expected valid date accepted', ok)
  const month = optionalISOMonth('2026-08')
  assert(month === '2026-08', 'expected valid month accepted', month)
}

const tests = [
  ['ledger amount/entry bad request codes', testLedgerAmountBadRequest],
  ['todo/schedule title/startAt bad request codes', testTodoAndScheduleBadRequest],
  ['date validator rejects fake calendar dates', testDateValidatorRejectsFakeDates]
]

let passed = 0

for (const [name, test] of tests) {
  await test()
  passed += 1
  console.log(`PASS services - ${name}`)
}

console.log(`tests/services/validation-http.test.mjs: passed ${passed}/${tests.length}`)
