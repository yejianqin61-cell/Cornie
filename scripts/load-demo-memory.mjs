import path from 'node:path'
import { loadDemoMemorySet, resetDemoMemorySet } from '../electron/backend/memory-wiki/demoMemory.js'

const baseDirFlag = process.argv.indexOf('--base-dir')
const baseDir = baseDirFlag >= 0 ? process.argv[baseDirFlag + 1] : ''
const reset = process.argv.includes('--reset')

if (!baseDir) {
  console.error('Usage: node scripts/load-demo-memory.mjs --base-dir <demo-directory> [--reset]')
  process.exitCode = 1
} else {
  const result = reset
    ? await resetDemoMemorySet({ baseDir: path.resolve(baseDir) })
    : await loadDemoMemorySet({ baseDir: path.resolve(baseDir) })
  console.log(JSON.stringify(result, null, 2))
}
