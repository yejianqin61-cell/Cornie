import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const mode = process.argv[2]

const modeDirectories = {
  fast: ['protocol', 'policy', 'services'],
  integration: ['tools', 'orchestrator', 'memory-governance'],
  full: [
    'protocol',
    'policy',
    'services',
    'tools',
    'orchestrator',
    'memory-governance'
  ]
}

const verifyScriptsForFull = ['scripts/verify-7.1-runner.mjs', 'scripts/verify-7.2-runner.mjs']

if (!modeDirectories[mode]) {
  console.error('Usage: node scripts/run-tests.mjs <fast|integration|full>')
  process.exit(1)
}

function collectTestFiles(directoryName) {
  const directoryPath = path.join(repoRoot, 'tests', directoryName)
  const entries = readdirSync(directoryPath, { withFileTypes: true })

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.test.mjs'))
    .map((entry) => path.join(directoryPath, entry.name))
    .sort()
}

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false
  })

  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error)
    }
    process.exit(result.status ?? 1)
  }
}

const directories = modeDirectories[mode]
const testFiles = directories.flatMap(collectTestFiles)

if (testFiles.length === 0) {
  console.error(`No test files found for mode: ${mode}`)
  process.exit(1)
}

for (const testFile of testFiles) {
  console.log(`\n[tests:${mode}] running ${path.relative(repoRoot, testFile)}`)
  runNodeScript(testFile)
}

if (mode === 'full') {
  for (const verifyScript of verifyScriptsForFull) {
    console.log(`\n[tests:${mode}] running ${verifyScript}`)
    runNodeScript(path.join(repoRoot, verifyScript))
  }
}

console.log(`\n[tests:${mode}] passed`)
