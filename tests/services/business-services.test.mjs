import { createLedgerService } from '../../electron/backend/ledger/service.js'
import { createTodoService } from '../../electron/backend/todo/service.js'
import { createScheduleService } from '../../electron/backend/schedule/service.js'
import { createServiceHarness, assert } from '../shared/service-harness.mjs'

async function testLedgerServiceCrudAndCategories() {
  const harness = await createServiceHarness('ledger-service')
  try {
    const ledger = createLedgerService(harness.store)

    const category = ledger.createExpenseCategory({ name: '餐饮' })
    assert(category.name === '餐饮', 'expected created ledger category', category)

    const created = ledger.addExpense({
      amount: 66,
      categoryId: category.id,
      categoryName: category.name,
      item: '晚饭',
      sourceText: '晚饭花了66块',
      occurredAt: '2026-06-27T12:00:00.000Z'
    })

    const loaded = ledger.getEntry(created.id)
    assert(loaded?.amount === 66, 'expected ledger entry amount', loaded)

    const updated = ledger.updateEntry({
      id: created.id,
      amount: 88,
      item: '火锅'
    })
    assert(updated.amount === 88, 'expected updated ledger amount', updated)
    assert(updated.item === '火锅', 'expected updated ledger item', updated)
    assert(updated.categoryName === '餐饮', 'expected category kept on partial update', updated)

    const todayList = ledger.listToday({ date: '2026-06-27' })
    assert(todayList.some((item) => item.id === created.id), 'expected ledger listToday include entry', todayList)

    const deleted = ledger.deleteEntry({ id: created.id })
    assert(deleted.id === created.id, 'expected deleted entry returned', deleted)
    assert(ledger.getEntry(created.id) == null, 'expected entry removed after delete')
  } finally {
    await harness.close()
  }
}

async function testTodoServiceLifecycle() {
  const harness = await createServiceHarness('todo-service')
  try {
    const todo = createTodoService(harness.store)

    const category = todo.createCategory({ name: '学习' })
    const created = todo.create({
      title: '复习英语',
      categoryId: category.id,
      categoryName: category.name,
      sourceText: '今晚复习英语'
    })

    assert(created.status === 'pending', 'expected pending todo', created)

    const updated = todo.update({
      id: created.id,
      description: '先做阅读再做听力'
    })
    assert(updated.description === '先做阅读再做听力', 'expected todo description updated', updated)

    const completed = todo.complete({ id: created.id })
    assert(completed.status === 'done', 'expected todo completed', completed)

    const reopened = todo.reopen({ id: created.id })
    assert(reopened.status === 'pending', 'expected todo reopened', reopened)

    const cancelled = todo.delete({ id: created.id })
    assert(cancelled.status === 'cancelled', 'expected todo cancelled by delete', cancelled)
  } finally {
    await harness.close()
  }
}

async function testScheduleServiceLifecycle() {
  const harness = await createServiceHarness('schedule-service')
  try {
    const schedule = createScheduleService(harness.store)

    const category = schedule.createCategory({ name: '提醒' })
    const created = schedule.create({
      title: '带猫复查',
      startAt: '2026-07-01T10:00:00.000Z',
      location: '宠物医院',
      categoryId: category.id,
      categoryName: category.name,
      sourceText: '下周带猫复查'
    })

    assert(created.status === 'scheduled', 'expected scheduled entry', created)

    const updated = schedule.update({
      id: created.id,
      endAt: '2026-07-01T11:00:00.000Z'
    })
    assert(updated.endAt === '2026-07-01T11:00:00.000Z', 'expected endAt updated', updated)

    const cancelled = schedule.cancel({ id: created.id })
    assert(cancelled.status === 'cancelled', 'expected schedule cancelled', cancelled)

    const restored = schedule.restore({ id: created.id })
    assert(restored.status === 'scheduled', 'expected schedule restored', restored)

    const deleted = schedule.delete({ id: created.id })
    assert(deleted.id === created.id, 'expected delete return removed entry', deleted)
    assert(schedule.get(created.id) == null, 'expected deleted schedule removed')
  } finally {
    await harness.close()
  }
}

const tests = [
  ['ledger service crud and categories', testLedgerServiceCrudAndCategories],
  ['todo service lifecycle', testTodoServiceLifecycle],
  ['schedule service lifecycle', testScheduleServiceLifecycle]
]

let passed = 0

for (const [name, test] of tests) {
  await test()
  passed += 1
  console.log(`PASS services - ${name}`)
}

console.log(`tests/services/business-services.test.mjs: passed ${passed}/${tests.length}`)
