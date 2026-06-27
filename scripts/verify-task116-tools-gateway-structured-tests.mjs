import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const commands = [
  ['test:integration', 'layered integration suite should include tools tests'],
  ['verify:task048-tools', 'legacy domain tool acceptance should remain available'],
  ['verify:task049-tools', 'legacy system tool acceptance should remain available'],
  ['verify:task098', 'legacy ledger tool acceptance should remain available'],
  ['verify:task103', 'legacy memory governance tool acceptance should remain available']
]

for (const [scriptName, label] of commands) {
  console.log(`\n[task116] running ${scriptName} - ${label}`)

  const result = spawnSync('cmd.exe', ['/c', 'npm.cmd', 'run', scriptName], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false
  })

  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error)
    }
    console.error(`\n[task116] failed at ${scriptName}`)
    process.exit(result.status ?? 1)
  }
}

console.log('\nverify-task116-tools-gateway-structured-tests: passed')
