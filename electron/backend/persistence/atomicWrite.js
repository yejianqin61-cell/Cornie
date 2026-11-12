import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

function tempPathFor(filePath) {
  return `${filePath}.${randomUUID()}.tmp`
}

const RENAME_RETRY_DELAYS_MS = [10, 20, 40, 80, 160]

// Windows 上目标文件正被另一个读取打开时，rename 会瞬时失败（EPERM/EBUSY）；短退避后重试即可。
async function renameWithRetry(rename, from, to) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await rename(from, to)
    } catch (error) {
      const transient = error?.code === 'EPERM' || error?.code === 'EBUSY'
      if (!transient || attempt >= RENAME_RETRY_DELAYS_MS.length) throw error
      await new Promise((resolve) => setTimeout(resolve, RENAME_RETRY_DELAYS_MS[attempt]))
    }
  }
}

export async function atomicWriteFile(filePath, data, { writeFile = fsp.writeFile, rename = fsp.rename, remove = fsp.rm } = {}) {
  const tempPath = tempPathFor(filePath)
  try {
    await writeFile(tempPath, data)
    await renameWithRetry(rename, tempPath, filePath)
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

