import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const commands = [
  ['test:integration', 'layered integration suite should include memory governance tests'],
  ['verify:task105', 'legacy governance store acceptance should remain available'],
  ['verify:task106', 'legacy governance tools acceptance should remain available'],
  ['verify:task107', 'legacy status tiers acceptance should remain available'],
  ['verify:task108', 'legacy topic heat acceptance should remain available'],
  ['verify:task109', 'legacy compression acceptance should remain available'],
  ['verify:task110', 'legacy inspection queue acceptance should remain available'],
  ['verify:task111', 'legacy 7.2 aggregate acceptance should remain available']
]

for (const [scriptName, label] of commands) {
  console.log(`\n[task118] running ${scriptName} - ${label}`)

  const result = spawnSync('cmd.exe', ['/c', 'npm.cmd', 'run', scriptName], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false
  })

  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error)
    }
    console.error(`\n[task118] failed at ${scriptName}`)
    process.exit(result.status ?? 1)
  }
}

console.log('\nverify-task118-memory-governance-structured-tests: passed')
