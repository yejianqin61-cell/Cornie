import { createConfirmService } from '../../electron/backend/confirm/service.js'
import { createServiceHarness, assert } from '../shared/service-harness.mjs'

async function testConfirmCreateAndApproveLifecycle() {
  const harness = await createServiceHarness('confirm-approve')
  try {
    const confirm = createConfirmService(harness.store)
    const pending = confirm.createPending({
      date: '2026-06-27',
      conversationMessageId: 'msg-confirm-approve',
      sourceText: '记一笔午饭66块',
      assistantReply: '小铃湾先帮主人执行这次操作。',
      toolCalls: [
        {
          tool_name: 'ledger.add_expense',
          arguments: {
            amount: 66,
            categoryId: 'exp_food',
            categoryName: '餐饮',
            item: '午饭',
            sourceText: '记一笔午饭66块',
            occurredAt: '2026-06-27T12:00:00.000Z'
          }
        }
      ],
      confirmRequest: {
        kind: 'tool_confirmation',
        toolName: 'ledger.add_expense',
        reason: '需要确认后执行'
      }
    })

    const fetched = confirm.get(pending.id)
    assert(fetched?.status === 'pending', 'expected pending confirmation persisted', fetched)

    const approved = confirm.approve(pending.id)
    assert(approved.status === 'approved', 'expected confirmation approved', approved)

    const listed = confirm.listByDate({ date: '2026-06-27', status: 'approved' })
    assert(listed.some((item) => item.id === pending.id), 'expected approved confirmation listed by date', listed)
  } finally {
    await harness.close()
  }
}

async function testConfirmReject() {
  const harness = await createServiceHarness('confirm-reject')
  try {
    const confirm = createConfirmService(harness.store)
    const pending = confirm.createPending({
      date: '2026-06-27',
      conversationMessageId: 'msg-confirm-reject',
      sourceText: '把这段记忆写进去',
      assistantReply: '小铃湾想先征得主人同意。',
      toolCalls: [
        {
          tool_name: 'memory.create',
          arguments: {
            kind: 'preference',
            title: '喜欢猫咪',
            content: '主人喜欢猫咪'
          }
        }
      ],
      confirmRequest: {
        kind: 'tool_confirmation',
        toolName: 'memory.create',
        reason: '长期记忆写入需要确认'
      }
    })

    const rejected = confirm.rejectConfirmation(pending.id)
    assert(rejected.confirmation.status === 'rejected', 'expected rejected confirmation', rejected)
    assert(String(rejected.cornieMessage?.content ?? '').includes('先不动手'), 'expected reject reply mention no action', rejected)
  } finally {
    await harness.close()
  }
}

const tests = [
  ['confirm create and approve lifecycle', testConfirmCreateAndApproveLifecycle],
  ['confirm reject', testConfirmReject]
]

let passed = 0

for (const [name, test] of tests) {
  await test()
  passed += 1
  console.log(`PASS services - ${name}`)
}

console.log(`tests/services/confirm-service.test.mjs: passed ${passed}/${tests.length}`)
