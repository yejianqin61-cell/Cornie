import { buildExportArchive } from './exporter.js'

function pad(n) {
  return String(n).padStart(2, '0')
}

export function defaultExportFileName(now) {
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `cornie-export-${date}-${time}.zip`
}

export async function handleExportRequest({
  store,
  memoryRoot,
  now = new Date(),
  showSaveDialog,
  writeFile
}) {
  try {
    const choice = await showSaveDialog({
      title: '导出 Cornie 数据',
      defaultPath: defaultExportFileName(now),
      filters: [{ name: 'Zip', extensions: ['zip'] }]
    })
    if (choice.canceled || !choice.filePath) return { ok: false, canceled: true }

    store.persist()
    const archive = await buildExportArchive({ store, memoryRoot, now })
    await writeFile(choice.filePath, archive)
    return { ok: true, path: choice.filePath, bytes: archive.length }
  } catch (error) {
    return { ok: false, error: error?.message ?? String(error) }
  }
}
