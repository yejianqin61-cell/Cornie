import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const checks = [
  ['verify:task112', 'tests 目录骨架与分层脚本'],
  ['verify:task113', 'protocol 结构化测试'],
  ['verify:task114', 'policy 结构化测试'],
  ['verify:task115', 'service 结构化测试'],
  ['verify:task116', 'tools 与 gateway 结构化测试'],
  ['verify:task117', 'orchestrator 结构化测试'],
  ['verify:task118', 'memory governance 结构化测试']
]

for (const [scriptName, label] of checks) {
  console.log(`\n[7.3-tests] running ${scriptName} - ${label}`)

  const result = spawnSync('cmd.exe', ['/c', 'npm.cmd', 'run', scriptName], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false
  })

  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error)
    }
    console.error(`\n[7.3-tests] failed at ${scriptName}`)
    process.exit(result.status ?? 1)
  }
}

console.log('\nverify-7.3: passed')
