import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

async function verifyFiles() {
  const files = [
    'tests/frontend/app-navigation.test.mjs',
    'tests/frontend/confirm-card.test.mjs',
    'tests/frontend/chat-history.test.mjs'
  ]

  for (const relativePath of files) {
    await fs.access(path.join(repoRoot, relativePath))
  }
}

async function main() {
  await verifyFiles()

  const appTest = await fs.readFile(path.join(repoRoot, 'tests/frontend/app-navigation.test.mjs'), 'utf8')
  const confirmTest = await fs.readFile(path.join(repoRoot, 'tests/frontend/confirm-card.test.mjs'), 'utf8')
  const historyTest = await fs.readFile(path.join(repoRoot, 'tests/frontend/chat-history.test.mjs'), 'utf8')

  assert.match(appTest, /ledger-workspace-stub/, 'app navigation regression should cover workspace switching')
  assert.match(confirmTest, /emitted\('confirm'\)/, 'confirm card regression should verify emitted actions')
  assert.match(historyTest, /读取聊天记录失败/, 'chat history regression should cover readable error state')

  console.log('verify-task137-frontend-component-regression: passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
