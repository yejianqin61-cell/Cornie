import assert from 'node:assert/strict'
import { exec } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execAsync = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

async function verifyFiles() {
  const files = [
    'tests/frontend/api-contract.test.mjs',
    'tests/frontend/app-settings-flow.test.mjs',
    'tests/frontend/ledger-workspace-async.test.mjs'
  ]

  for (const relativePath of files) {
    await fs.access(path.join(repoRoot, relativePath))
  }
}

async function runVitestSelection() {
  await execAsync(
    'npm.cmd run test:frontend -- tests/frontend/api-contract.test.mjs tests/frontend/app-settings-flow.test.mjs tests/frontend/ledger-workspace-async.test.mjs',
    {
      cwd: repoRoot
    }
  )
}

async function main() {
  await verifyFiles()
  await runVitestSelection()

  const apiTest = await fs.readFile(path.join(repoRoot, 'tests/frontend/api-contract.test.mjs'), 'utf8')
  const settingsTest = await fs.readFile(path.join(repoRoot, 'tests/frontend/app-settings-flow.test.mjs'), 'utf8')
  const ledgerTest = await fs.readFile(path.join(repoRoot, 'tests/frontend/ledger-workspace-async.test.mjs'), 'utf8')

  assert.match(apiTest, /deepseek upstream timeout/, 'api contract tests should cover backend failure text')
  assert.match(settingsTest, /清空已保存钥匙/, 'settings flow tests should cover clearing persisted key')
  assert.match(ledgerTest, /收支记录加载失败/, 'ledger async tests should cover readable error state')

  console.log('verify-task138-frontend-async-flows: passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
