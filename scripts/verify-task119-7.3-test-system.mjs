import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const requiredPaths = [
  'tests/protocol/json-protocol.test.mjs',
  'tests/policy/tool-policy.test.mjs',
  'tests/services/business-services.test.mjs',
  'tests/tools/registry-gateway.test.mjs',
  'tests/orchestrator/conversation-orchestrator.test.mjs',
  'tests/memory-governance/memory-governance.test.mjs',
  'scripts/verify-7.3.mjs',
  'doc/acceptance/7.3-测试体系模块阶段验收.md'
]

for (const relativePath of requiredPaths) {
  const absolutePath = path.join(repoRoot, relativePath)
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required path: ${relativePath}`)
  }
}

const commands = [
  ['verify:7.3-tests', '7.3 aggregate acceptance entry'],
  ['test:full', 'full layered test suite with legacy acceptance runners']
]

for (const [scriptName, label] of commands) {
  console.log(`\n[task119] running ${scriptName} - ${label}`)

  const result = spawnSync('cmd.exe', ['/c', 'npm.cmd', 'run', scriptName], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false
  })

  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error)
    }
    console.error(`\n[task119] failed at ${scriptName}`)
    process.exit(result.status ?? 1)
  }
}

console.log('\nverify-task119-7.3-test-system: passed')
