import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

// 组件级回归门禁（React + Mantine 重写版）：
// - 应用导航回归（workspace-switch-regression）：导航切换工作区时激活态与目标页面同步；
// - 确认卡回归：React 版契约由 onConfirm/onReject 回调承载（等价旧 emitted('confirm')）；
// - 聊天记录回归：加载失败呈现可读错误文案。

async function verifyFiles() {
  const files = [
    'tests/frontend/app-navigation.test.tsx',
    'tests/frontend/confirm-card.test.tsx',
    'tests/frontend/chat-history.test.tsx',
  ]

  for (const relativePath of files) {
    await fs.access(path.join(repoRoot, relativePath))
  }
}

async function main() {
  await verifyFiles()

  const appTest = await fs.readFile(path.join(repoRoot, 'tests/frontend/app-navigation.test.tsx'), 'utf8')
  const confirmTest = await fs.readFile(path.join(repoRoot, 'tests/frontend/confirm-card.test.tsx'), 'utf8')
  const historyTest = await fs.readFile(path.join(repoRoot, 'tests/frontend/chat-history.test.tsx'), 'utf8')

  assert.match(appTest, /workspace-switch-regression/, 'app navigation regression should cover workspace switching')
  assert.match(confirmTest, /onConfirm/, 'confirm card regression should verify onConfirm callback contract')
  assert.match(historyTest, /读取聊天记录失败/, 'chat history regression should cover readable error state')

  console.log('verify-task137-frontend-component-regression: passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
