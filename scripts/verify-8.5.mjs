import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const checks = [
  ['verify:task136', 'frontend test harness'],
  ['verify:task137', 'page and component regression'],
  ['verify:task138', 'api and async interaction flows']
]

for (const [scriptName, label] of checks) {
  console.log(`\n[8.5] running ${scriptName} - ${label}`)

  const result = spawnSync('cmd.exe', ['/c', 'npm.cmd', 'run', scriptName], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false
  })

  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error)
    }
    console.error(`\n[8.5] failed at ${scriptName}`)
    process.exit(result.status ?? 1)
  }
}

const summaryPath = path.join(repoRoot, 'coverage', 'frontend', 'coverage-summary.json')
const hasCoverageSummary = await fs
  .access(summaryPath)
  .then(() => true)
  .catch(() => false)

if (!hasCoverageSummary) {
  console.warn('[8.5] coverage summary not found yet; run test:frontend:coverage in approved environment before final acceptance')
}

console.log('\nverify-8.5: passed (progress audit mode)')
