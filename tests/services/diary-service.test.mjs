import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { createServiceHarness, assert } from '../shared/service-harness.mjs'
import { diaryService } from '../../electron/backend/diary/service.js'

// BE-06：空条目兜底。service.generateCornie 内部 buildWikiContext 使用 process.cwd() 作 baseDir，
// 测试先 chdir 到临时目录，避免读到仓库内真实记忆数据。
async function withTmpCwd(fn) {
  const originalCwd = process.cwd()
  const tmpCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cornie-diary-cwd-'))
  process.chdir(tmpCwd)
  try {
    await fn()
  } finally {
    process.chdir(originalCwd)
    fs.rmSync(tmpCwd, { recursive: true, force: true })
  }
}

async function testEmptyEntryDoesNotThrow() {
  await withTmpCwd(async () => {
    const harness = await createServiceHarness('be06-diary-empty')
    try {
      const svc = diaryService(harness.store)
      const fakeChat = async () => ({ content: '铃湾写下的日记正文', finishReason: 'stop' })

      // 无日记条目的日期：不抛 TypeError，正常返回生成文本
      const result = await svc.generateCornie({ date: '2099-01-01' }, { chatFn: fakeChat })
      assert(
        result && result.cornieText === '铃湾写下的日记正文',
        'expected diary text generated for empty entry',
        result
      )

      const stored = svc.getEntry('2099-01-01')
      assert(stored?.cornieText === '铃湾写下的日记正文', 'expected cornieText persisted', stored)
    } finally {
      await harness.close()
    }
  })
}

async function testUserTextPassedToPrompt() {
  await withTmpCwd(async () => {
    const harness = await createServiceHarness('be06-diary-usertext')
    try {
      const svc = diaryService(harness.store)
      await svc.upsertUserText({ date: '2026-08-21', userText: '今天去了咖啡馆', cornieText: '' })

      let receivedPrompt = ''
      const fakeChat = async ({ prompt }) => {
        receivedPrompt = prompt
        return { content: '铃湾写下的日记正文', finishReason: 'stop' }
      }

      await svc.generateCornie({ date: '2026-08-21' }, { chatFn: fakeChat })
      assert(receivedPrompt.includes('今天去了咖啡馆'), 'expected userText in generation prompt', receivedPrompt.slice(0, 200))
    } finally {
      await harness.close()
    }
  })
}

const tests = [
  ['diary empty entry guard', testEmptyEntryDoesNotThrow],
  ['diary userText passed to prompt', testUserTextPassedToPrompt]
]

let passed = 0

for (const [name, test] of tests) {
  await test()
  passed += 1
  console.log(`PASS services - ${name}`)
}

console.log(`tests/services/diary-service.test.mjs: passed ${passed}/${tests.length}`)
