import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

async function main() {
  const summaryPath = path.join(repoRoot, 'coverage', 'frontend', 'coverage-summary.json')
  const raw = await fs.readFile(summaryPath, 'utf8')
  const summary = JSON.parse(raw)
  const total = summary.total

  assert.ok(total, 'coverage summary should contain total metrics')
  assert.equal(typeof total.lines?.pct, 'number', 'coverage summary should expose line coverage pct')
  assert.equal(typeof total.statements?.pct, 'number', 'coverage summary should expose statement coverage pct')

  const report = {
    statementsPct: total.statements.pct,
    branchesPct: total.branches.pct,
    functionsPct: total.functions.pct,
    linesPct: total.lines.pct,
    meets95Target:
      total.statements.pct >= 95 &&
      total.branches.pct >= 95 &&
      total.functions.pct >= 95 &&
      total.lines.pct >= 95
  }

  console.log(JSON.stringify(report, null, 2))
  console.log('verify-task139-frontend-coverage-audit: passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
