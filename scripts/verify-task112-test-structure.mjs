import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const requiredPaths = [
  'tests/protocol',
  'tests/policy',
  'tests/services',
  'tests/tools',
  'tests/orchestrator',
  'tests/memory-governance',
  'scripts/run-tests.mjs',
  'scripts/verify-7.1-runner.mjs',
  'scripts/verify-7.2-runner.mjs'
]

for (const relativePath of requiredPaths) {
  const absolutePath = path.join(repoRoot, relativePath)
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required path: ${relativePath}`)
  }
}

const commands = [
  ['test:fast', 'fast layered test entry'],
  ['test:integration', 'integration layered test entry'],
  ['test:full', 'full layered test entry'],
]

for (const [scriptName, label] of commands) {
  console.log(`\n[task112] running ${scriptName} - ${label}`)
  const result = spawnSync('cmd.exe', ['/c', 'npm.cmd', 'run', scriptName], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false
  })

  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error)
    }
    console.error(`\n[task112] failed at ${scriptName}`)
    process.exit(result.status ?? 1)
  }
}

console.log('\nverify-task112-test-structure: passed')
