import path from 'node:path'
import { loadDemoMemorySet } from '../electron/backend/memory-wiki/demoMemory.js'

const baseDirFlag = process.argv.indexOf('--base-dir')
const baseDir = baseDirFlag >= 0 ? process.argv[baseDirFlag + 1] : ''

if (!baseDir) {
  console.error('Usage: node scripts/load-demo-memory.mjs --base-dir <demo-directory>')
  process.exitCode = 1
} else {
  const result = await loadDemoMemorySet({ baseDir: path.resolve(baseDir) })
  console.log(JSON.stringify(result, null, 2))
}
