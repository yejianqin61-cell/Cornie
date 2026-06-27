import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const runtimeTmpRoot = path.join(repoRoot, 'tmp', 'runtime-tests')

export function getRuntimeTmpRoot() {
  return runtimeTmpRoot
}

export async function ensureRuntimeTmpRoot() {
  await fsPromises.mkdir(runtimeTmpRoot, { recursive: true })
  return runtimeTmpRoot
}

export async function createRuntimeSqlitePath(prefix, options = {}) {
  const extension = options.extension ?? '.sqlite'
  const keepNameStable = options.keepNameStable ?? false
  const baseName = keepNameStable ? prefix : `${prefix}-${randomUUID()}`
  const root = await ensureRuntimeTmpRoot()
  return path.join(root, `${baseName}${extension}`)
}

export async function createRuntimeTempDir(prefix, options = {}) {
  const keepNameStable = options.keepNameStable ?? false
  const baseName = keepNameStable ? prefix : `${prefix}-${randomUUID()}`
  const root = await ensureRuntimeTmpRoot()
  const dirPath = path.join(root, baseName)
  await fsPromises.mkdir(dirPath, { recursive: true })
  return dirPath
}

export function cleanupSqliteFile(dbPath) {
  const sidecars = [dbPath, `${dbPath}-shm`, `${dbPath}-wal`]
  for (const filePath of sidecars) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }
}

export async function clearRuntimeTmpRoot() {
  await fsPromises.rm(runtimeTmpRoot, { recursive: true, force: true })
}

export function listRootTmpSqliteArtifacts() {
  const entries = fs.readdirSync(repoRoot, { withFileTypes: true })
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        /^tmp-.*\.sqlite(?:-shm|-wal)?$/i.test(entry.name)
    )
    .map((entry) => path.join(repoRoot, entry.name))
    .sort()
}

export function clearRootTmpSqliteArtifacts() {
  const artifacts = listRootTmpSqliteArtifacts()
  for (const artifact of artifacts) {
    cleanupSqliteFile(artifact)
  }
  return artifacts.length
}

export function clearLegacyRootTmpDirectories() {
  const entries = fs.readdirSync(repoRoot, { withFileTypes: true })
  const directories = entries
    .filter((entry) => entry.isDirectory() && /^tmp-(policy-test|service-test)-/i.test(entry.name))
    .map((entry) => path.join(repoRoot, entry.name))
    .sort()

  for (const dirPath of directories) {
    fs.rmSync(dirPath, { recursive: true, force: true })
  }

  return directories.length
}

export function listRuntimeTmpArtifacts() {
  if (!fs.existsSync(runtimeTmpRoot)) {
    return []
  }
  return fs
    .readdirSync(runtimeTmpRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(runtimeTmpRoot, entry.name))
    .sort()
}
