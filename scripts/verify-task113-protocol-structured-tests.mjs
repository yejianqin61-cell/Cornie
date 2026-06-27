import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const commands = [
  ['test:fast', 'layered fast suite should include protocol tests'],
  ['verify:task052', 'legacy protocol/policy acceptance should remain available']
]

for (const [scriptName, label] of commands) {
  console.log(`\n[task113] running ${scriptName} - ${label}`)

  const result = spawnSync('cmd.exe', ['/c', 'npm.cmd', 'run', scriptName], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false
  })

  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error)
    }
    console.error(`\n[task113] failed at ${scriptName}`)
    process.exit(result.status ?? 1)
  }
}

console.log('\nverify-task113-protocol-structured-tests: passed')
