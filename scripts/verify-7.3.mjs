import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const checks = [
  ['scripts/verify-category-flow.mjs', '类目映射主链路专项回归'],
  ['scripts/verify-ledger-tools.mjs', '收支生命周期工具验证'],
  ['scripts/verify-task048-tools.mjs', '待办/日程类目删除与语义修正验证'],
  ['scripts/verify-task049-tools.mjs', '系统只读工具验证'],
  ['scripts/verify-task050-policy.mjs', '协议与策略对齐验证']
]

for (const [scriptPath, label] of checks) {
  console.log(`\n[7.3] running ${scriptPath} - ${label}`)

  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false
  })

  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error)
    }
    console.error(`\n[7.3] failed at ${scriptPath}`)
    process.exit(result.status ?? 1)
  }
}

console.log('\nverify-7.3: passed')
