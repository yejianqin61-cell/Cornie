import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  getLedgerCategory,
  getLedgerEntry,
  getScheduleCategory,
  getScheduleEntry,
  getTodoCategory,
  getTodoEntry,
  openDb,
  saveLedgerEntry,
  saveScheduleEntry,
  saveTodoEntry
} from '../electron/db.js'
import { buildAuditReport } from './shared-category-audit.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const defaultDbPath = path.join(repoRoot, 'cornie.sqlite')

function parseArgs(argv) {
  const options = {
    db: defaultDbPath,
    dryRun: true,
    apply: false,
    issueKind: null,
    help: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }
    if (arg === '--db' && next) {
      options.db = path.resolve(repoRoot, next)
      index += 1
      continue
    }
    if (arg === '--apply') {
      options.apply = true
      options.dryRun = false
      continue
    }
    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }
    if (arg === '--issue-kind' && next) {
      options.issueKind = next
      index += 1
      continue
    }
  }

  return options
}

function printHelp() {
  console.log([
    'Usage: node scripts/repair-category-data.mjs [options]',
    '',
    'Options:',
    '  --db <path>          SQLite database path',
    '  --dry-run            preview repairs without writing (default)',
    '  --apply              actually write supported repairs',
    '  --issue-kind <kind>  only process one issue kind',
    '  --help               show this help'
  ].join('\n'))
}

function getCategoryReader(issue) {
  if (issue.domain === 'ledger') {
    return getLedgerCategory
  }
  if (issue.domain === 'todo') {
    return getTodoCategory
  }
  if (issue.domain === 'schedule') {
    return getScheduleCategory
  }
  return null
}

function repairCategoryNameMismatch(store, issue, apply) {
  const categoryReader = getCategoryReader(issue)
  if (!categoryReader || !issue.entryId || !issue.expectedCategoryId) {
    return { status: 'skipped', reason: '缺少修复所需上下文' }
  }

  const expectedCategory = categoryReader(store, issue.expectedCategoryId)
  if (!expectedCategory) {
    return { status: 'skipped', reason: '目标类目不存在' }
  }

  if (issue.domain === 'ledger') {
    const entry = getLedgerEntry(store, issue.entryId)
    if (!entry) {
      return { status: 'skipped', reason: '目标记录不存在' }
    }
    const nextEntry = { ...entry, categoryName: expectedCategory.name }
    if (apply) {
      saveLedgerEntry(store, nextEntry)
    }
    return {
      status: apply ? 'repaired' : 'dry-run',
      before: entry.categoryName,
      after: expectedCategory.name
    }
  }

  if (issue.domain === 'todo') {
    const entry = getTodoEntry(store, issue.entryId)
    if (!entry) {
      return { status: 'skipped', reason: '目标记录不存在' }
    }
    const nextEntry = { ...entry, categoryName: expectedCategory.name }
    if (apply) {
      saveTodoEntry(store, nextEntry)
    }
    return {
      status: apply ? 'repaired' : 'dry-run',
      before: entry.categoryName,
      after: expectedCategory.name
    }
  }

  if (issue.domain === 'schedule') {
    const entry = getScheduleEntry(store, issue.entryId)
    if (!entry) {
      return { status: 'skipped', reason: '目标记录不存在' }
    }
    const nextEntry = { ...entry, categoryName: expectedCategory.name }
    if (apply) {
      saveScheduleEntry(store, nextEntry)
    }
    return {
      status: apply ? 'repaired' : 'dry-run',
      before: entry.categoryName,
      after: expectedCategory.name
    }
  }

  return { status: 'skipped', reason: '暂不支持该域修复' }
}

function processIssue(store, issue, apply) {
  if (issue.kind === 'category_name_mismatch') {
    return repairCategoryNameMismatch(store, issue, apply)
  }

  return {
    status: 'skipped',
    reason: '当前问题类型只支持巡检，不支持自动修复'
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const store = await openDb(options.db)
  try {
    const report = buildAuditReport(store, options.db)
    const issues = options.issueKind
      ? report.issues.filter((issue) => issue.kind === options.issueKind)
      : report.issues

    const results = issues.map((issue) => ({
      issue,
      result: processIssue(store, issue, options.apply)
    }))

    const summary = results.reduce(
      (accumulator, item) => {
        accumulator.total += 1
        accumulator[item.result.status] = (accumulator[item.result.status] ?? 0) + 1
        return accumulator
      },
      { total: 0, repaired: 0, skipped: 0, 'dry-run': 0 }
    )

    console.log(
      JSON.stringify(
        {
          dbPath: options.db,
          apply: options.apply,
          issueKind: options.issueKind,
          summary,
          results
        },
        null,
        2
      )
    )
  } finally {
    store.close()
  }
}

main()
