import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const commands = [
  ['test:integration', 'layered integration suite should include orchestrator tests'],
  ['verify:task053', 'legacy orchestrator acceptance should remain available']
]

for (const [scriptName, label] of commands) {
  console.log(`\n[task117] running ${scriptName} - ${label}`)

  const result = spawnSync('cmd.exe', ['/c', 'npm.cmd', 'run', scriptName], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false
  })

  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error)
    }
    console.error(`\n[task117] failed at ${scriptName}`)
    process.exit(result.status ?? 1)
  }
}

console.log('\nverify-task117-orchestrator-structured-tests: passed')
