import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

async function main() {
  const packageJson = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'))
  const viteConfig = await fs.readFile(path.join(repoRoot, 'vite.config.js'), 'utf8')
  const setupFile = await fs.readFile(path.join(repoRoot, 'tests/frontend/setup.mjs'), 'utf8')
  const smokeTest = await fs.readFile(path.join(repoRoot, 'tests/frontend/app-smoke.test.mjs'), 'utf8')
  const summary = JSON.parse(await fs.readFile(path.join(repoRoot, 'coverage/frontend/coverage-summary.json'), 'utf8'))

  assert.equal(packageJson.scripts['test:frontend'], 'vitest run', 'test:frontend script should exist')
  assert.equal(packageJson.scripts['test:frontend:coverage'], 'vitest run --coverage', 'test:frontend:coverage script should exist')
  assert.match(viteConfig, /environment:\s*'jsdom'/, 'vite config should enable jsdom frontend tests')
  assert.match(viteConfig, /reportsDirectory:\s*'\.\/coverage\/frontend'/, 'vite config should emit frontend coverage reports')
  assert.match(setupFile, /ResizeObserver/, 'frontend setup should include jsdom shims')
  assert.match(smokeTest, /先把 DeepSeek 的钥匙交给铃湾吧/, 'smoke test should cover onboarding gate')
  assert.ok(summary.total, 'frontend coverage summary should exist after coverage run')

  console.log('verify-task136-frontend-test-harness: passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
