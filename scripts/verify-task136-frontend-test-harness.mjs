import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

// 前端测试基建门禁（React + Mantine 重写版）：
// - 测试脚本与 jsdom 环境契约（vitest 配置迁入 vite.config.ts）；
// - setup.ts 保留 jsdom shim（ResizeObserver / fetch / matchMedia / document.fonts / cornieDesktop）；
// - 烟测覆盖配网引导门禁（未配置 DeepSeek 时遮蔽内容区）。

async function main() {
  const packageJson = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'))
  const viteConfig = await fs.readFile(path.join(repoRoot, 'vite.config.ts'), 'utf8')
  const setupFile = await fs.readFile(path.join(repoRoot, 'tests/frontend/setup.ts'), 'utf8')
  const smokeTest = await fs.readFile(path.join(repoRoot, 'tests/frontend/app-smoke.test.tsx'), 'utf8')
  const summaryPath = path.join(repoRoot, 'coverage/frontend/coverage-summary.json')

  assert.equal(packageJson.scripts['test:frontend'], 'vitest run', 'test:frontend script should exist')
  assert.match(
    packageJson.scripts['test:frontend:coverage'],
    /vitest run --coverage/,
    'test:frontend:coverage script should run vitest coverage'
  )
  assert.match(viteConfig, /environment:\s*'jsdom'/, 'vite config should enable jsdom frontend tests')
  assert.match(viteConfig, /reportsDirectory:\s*'\.\/coverage\/frontend'/, 'vite config should emit frontend coverage reports')
  assert.match(setupFile, /ResizeObserver/, 'frontend setup should include jsdom shims')
  assert.match(setupFile, /matchMedia/, 'frontend setup should stub matchMedia for MantineProvider')
  assert.match(smokeTest, /先把 DeepSeek 的钥匙交给铃湾吧/, 'smoke test should cover onboarding gate')
  if (await fs.access(summaryPath).then(() => true, () => false)) {
    const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'))
    assert.ok(summary.total, 'frontend coverage summary should exist after coverage run')
  }

  console.log('verify-task136-frontend-test-harness: passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
