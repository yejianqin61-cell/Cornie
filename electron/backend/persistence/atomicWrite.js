import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

function tempPathFor(filePath) {
  return `${filePath}.${randomUUID()}.tmp`
}

export async function atomicWriteFile(filePath, data, { writeFile = fsp.writeFile, rename = fsp.rename, remove = fsp.rm } = {}) {
  const tempPath = tempPathFor(filePath)
  try {
    await writeFile(tempPath, data)
    await rename(tempPath, filePath)
  } catch (error) {
    try {
      await remove(tempPath, { force: true })
    } catch {}
    throw error
  }
}

export function atomicWriteFileSync(filePath, data, { writeFile = fs.writeFileSync, rename = fs.renameSync, remove = fs.rmSync } = {}) {
  const tempPath = tempPathFor(filePath)
  try {
    writeFile(tempPath, data)
    rename(tempPath, filePath)
  } catch (error) {
    try {
      remove(tempPath, { force: true })
    } catch {}
    throw error
  }
}

