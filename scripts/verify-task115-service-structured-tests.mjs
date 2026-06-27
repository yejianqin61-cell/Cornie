import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const commands = [
  ['test:fast', 'layered fast suite should include services tests'],
  ['verify:task053', 'legacy confirm/orchestrator/service acceptance should remain available'],
  ['verify:task058', 'legacy memory wiki service acceptance should remain available'],
  ['verify:task060', 'legacy memory wiki lifecycle acceptance should remain available'],
  ['verify:task062', 'legacy topic index store acceptance should remain available']
]

for (const [scriptName, label] of commands) {
  console.log(`\n[task115] running ${scriptName} - ${label}`)

  const result = spawnSync('cmd.exe', ['/c', 'npm.cmd', 'run', scriptName], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false
  })

  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error)
    }
    console.error(`\n[task115] failed at ${scriptName}`)
    process.exit(result.status ?? 1)
  }
}

console.log('\nverify-task115-service-structured-tests: passed')
