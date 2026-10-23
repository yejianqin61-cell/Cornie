import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function main() {
  const packageJson = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'))
  const releaseDir = path.join(repoRoot, packageJson.build.directories.output)
  const artifacts = await fs.readdir(releaseDir)
  assert.equal(packageJson.build.appId, 'com.cornie.desktop')
  assert.equal(packageJson.build.win.target[0].target, 'nsis')
  assert.equal(packageJson.build.win.target[0].arch[0], 'x64')
  assert.equal(packageJson.build.nsis.deleteAppDataOnUninstall, false)
  assert.ok(artifacts.some((name) => /Setup.*\.exe$/i.test(name)), 'NSIS installer artifact is missing')
  assert.ok(artifacts.includes('win-unpacked'), 'unpacked Windows application is missing')
  console.log('verify-phase5-installer: passed')
}

main().catch((error) => {
  console.error('verify-phase5-installer: failed')
  console.error(error?.stack ?? error)
  process.exitCode = 1
})
