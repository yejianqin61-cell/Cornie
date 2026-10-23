import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { atomicWriteFile } from '../electron/backend/persistence/atomicWrite.js'

async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-phase5-atomic-'))
  const target = path.join(root, 'snapshot.json')
  await fs.writeFile(target, 'old-snapshot', 'utf8')
  let writes = 0
  await assert.rejects(
    atomicWriteFile(target, 'new-snapshot', {
      writeFile: async (...args) => {
        writes += 1
        return fs.writeFile(...args)
      },
      rename: async () => {
        throw new Error('simulated replace failure')
      }
    }),
    /simulated replace failure/
  )
  assert.equal(writes, 1)
  assert.equal(await fs.readFile(target, 'utf8'), 'old-snapshot')

  await atomicWriteFile(target, 'new-snapshot')
  assert.equal(await fs.readFile(target, 'utf8'), 'new-snapshot')
  console.log('verify-phase5-atomic-persistence: passed')
}

main().catch((error) => {
  console.error('verify-phase5-atomic-persistence: failed')
  console.error(error?.stack ?? error)
  process.exitCode = 1
})
