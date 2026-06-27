import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const checks = [
  ['verify:task132', 'persistent model settings'],
  ['verify:task133', 'deepseek onboarding gate'],
  ['verify:task134', 'friendly onboarding copy'],
  ['build', 'frontend production build']
]

for (const [scriptName, label] of checks) {
  console.log(`\n[8.4] running ${scriptName} - ${label}`)

  const commandArgs =
    scriptName === 'build'
      ? ['/c', 'npm.cmd', 'run', 'build']
      : ['/c', 'npm.cmd', 'run', scriptName]

  const result = spawnSync('cmd.exe', commandArgs, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false
  })

  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error)
    }
    console.error(`\n[8.4] failed at ${scriptName}`)
    process.exit(result.status ?? 1)
  }
}

console.log('\nverify-8.4: passed')
