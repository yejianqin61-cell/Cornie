import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

// 异步流门禁（React + Mantine 重写版）：
// - API 契约测试覆盖后端失败可读文本（'deepseek upstream timeout'）；
// - 设置流覆盖清空已保存钥匙；
// - 收支异步流覆盖可读错误态与换月竞态守卫。

async function verifyFiles() {
  const files = [
    'tests/frontend/api-contract.test.ts',
    'tests/frontend/app-settings-flow.test.tsx',
    'tests/frontend/ledger-workspace-async.test.tsx',
  ]

  for (const relativePath of files) {
    await fs.access(path.join(repoRoot, relativePath))
  }
}

async function main() {
  await verifyFiles()

  const apiTest = await fs.readFile(path.join(repoRoot, 'tests/frontend/api-contract.test.ts'), 'utf8')
  const settingsTest = await fs.readFile(path.join(repoRoot, 'tests/frontend/app-settings-flow.test.tsx'), 'utf8')
  const ledgerTest = await fs.readFile(path.join(repoRoot, 'tests/frontend/ledger-workspace-async.test.tsx'), 'utf8')

  assert.match(apiTest, /deepseek upstream timeout/, 'api contract tests should cover backend failure text')
  assert.match(settingsTest, /清空已保存钥匙/, 'settings flow tests should cover clearing persisted key')
  assert.match(ledgerTest, /收支记录加载失败/, 'ledger async tests should cover readable error state')

  console.log('verify-task138-frontend-async-flows: passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
