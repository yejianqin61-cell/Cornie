import { spawnSync } from 'node:child_process'

const tasks = ['verify:task074', 'verify:task075', 'verify:task076']

for (const task of tasks) {
  const result = spawnSync('cmd.exe', ['/d', '/s', '/c', `npm.cmd run ${task}`], {
    stdio: 'inherit',
    shell: false
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log('verify-m6-memory-wiki-human-interfaces: ok')
