import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import { createMemoryWikiGovernanceStore } from '../electron/backend/memory-wiki/governanceStore.js'

function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message)
    error.details = details
    throw error
  }
}

async function expectIllegal(promise, label) {
  let threw = false
  try {
    await promise
  } catch (error) {
    threw = String(error.message).includes('illegal governance status transition')
  }
  assert(threw, `${label} 应因非法转移被拒绝`)
}

async function main() {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cornie-verify459-'))
  try {
    const store = await createMemoryWikiGovernanceStore(baseDir)

    const created = await store.create({
      requestType: 'test',
      queueSection: 'test',
      status: 'pending',
      title: '状态机测试'
    })
    const id = created.requestId

    // 合法转移：pending → approved / rejected / deferred
    const approved = await store.updateStatus(id, 'approved')
    assert(approved.status === 'approved', 'pending -> approved 应成功')
    await expectIllegal(store.updateStatus(id, 'rejected'), 'approved -> rejected')

    const second = await store.create({ requestType: 'test', queueSection: 'test', status: 'pending', title: 't2' })
    await store.updateStatus(second.requestId, 'rejected')
    await expectIllegal(store.updateStatus(second.requestId, 'pending'), 'rejected -> pending')

    const third = await store.create({ requestType: 'test', queueSection: 'test', status: 'pending', title: 't3' })
    const deferred = await store.updateStatus(third.requestId, 'deferred')
    assert(deferred.status === 'deferred', 'pending -> deferred 应成功')
    await expectIllegal(store.updateStatus(third.requestId, 'approved'), 'deferred -> approved 直接应用应被拒绝')

    // 复活：deferred -> pending -> approved
    const revived = await store.reactivateDeferred(third.requestId)
    assert(revived.status === 'pending', 'reactivateDeferred 应把 deferred 复活为 pending')
    const applied = await store.updateStatus(third.requestId, 'approved')
    assert(applied.status === 'approved', '复活后 pending -> approved 应成功')

    // 对非 deferred 请求 reactivate 应报错
    await expectIllegal(store.reactivateDeferred(approved.requestId), 'reactivateDeferred 仅对 deferred 有效')

    console.log('verify-task459-governance-state-machine: ok')
  } finally {
    fs.rmSync(baseDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
