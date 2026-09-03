import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

// 日记流门禁（React + Mantine 重写版）：
// - 保存失败分支（'保存日记失败'）；
// - 往年今日加载失败分支（'往年今日加载失败'）；
// - regenerate-cornie 长任务流程（含本地未保存 userText 不被覆盖的重写修复）。

async function main() {
  const testPath = path.join(repoRoot, 'tests/frontend/app-diary-flow.test.tsx')
  const content = await fs.readFile(testPath, 'utf8')

  assert.match(content, /保存日记失败/, 'app diary tests should cover save failure branch')
  assert.match(content, /往年今日加载失败/, 'app diary tests should cover on-this-day failure branch')
  assert.match(content, /regenerate-cornie/, 'app diary tests should cover cornie regeneration flow')

  console.log('verify-task140-app-diary-flows: passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
