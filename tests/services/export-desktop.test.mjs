import { handleExportRequest } from '../../electron/backend/export/desktop.js'
import { assert, createServiceHarness } from '../shared/service-harness.mjs'

const harness = await createServiceHarness('export-desktop')
try {
  const { store, baseDir } = harness
  const memoryRoot = `${baseDir}/none`
  const now = new Date('2026-11-12T21:05:09')

  // cases 1 and 4
  const writes = []
  let dialogOptions
  const ok = await handleExportRequest({
    store,
    memoryRoot,
    now,
    showSaveDialog: async (options) => ((dialogOptions = options), { canceled: false, filePath: 'X.zip' }),
    writeFile: async (file, data) => void writes.push({ file, data })
  })
  assert(ok.ok === true && ok.path === 'X.zip', 'case 1: ok with path', ok)
  assert(writes.length === 1 && writes[0].file === 'X.zip', 'case 1: wrote to the chosen path', writes)
  assert(writes[0].data.subarray(0, 2).toString() === 'PK', 'case 1: valid zip header')
  assert(dialogOptions.defaultPath === 'cornie-export-20261112-210509.zip', 'case 4: default file name', dialogOptions)

  // case 2
  const none = []
  const canceled = await handleExportRequest({
    store,
    memoryRoot,
    now,
    showSaveDialog: async () => ({ canceled: true }),
    writeFile: async () => void none.push(1)
  })
  assert(canceled.ok === false && canceled.canceled === true && none.length === 0, 'case 2: canceled', canceled)

  // case 3
  const failed = await handleExportRequest({
    store,
    memoryRoot,
    now,
    showSaveDialog: async () => ({ canceled: false, filePath: 'Y.zip' }),
    writeFile: async () => {
      throw new Error('EACCES: permission denied')
    }
  })
  assert(failed.ok === false && failed.error.includes('EACCES'), 'case 3: error returned', failed)
} finally {
  await harness.close()
}

console.log('tests/services/export-desktop.test.mjs: passed 4/4')
