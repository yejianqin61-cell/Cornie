import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const result = spawnSync('cmd.exe', ['/c', 'npm.cmd', 'run', 'verify:7.2'], {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: false
})

if (result.status !== 0) {
  if (result.error) {
    console.error(result.error)
  }
  process.exit(result.status ?? 1)
}
