import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildCategorySampleLedgerMarkdown,
  filterCategoryAuditSamples,
  normalizeCategoryAuditSamples
} from '../electron/backend/category/samples.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const defaultInput = path.join(repoRoot, 'tmp-category-audit-log.json')
const defaultOutput = path.join(repoRoot, 'tmp-category-samples.md')

function parseArgs(argv) {
  const options = {
    input: defaultInput,
    output: defaultOutput,
    domain: null,
    finalOutcome: null,
    issueTag: null
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]

    if (arg === '--input' && next) {
      options.input = path.resolve(repoRoot, next)
      index += 1
      continue
    }
    if (arg === '--output' && next) {
      options.output = path.resolve(repoRoot, next)
      index += 1
      continue
    }
    if (arg === '--domain' && next) {
      options.domain = next
      index += 1
      continue
    }
    if (arg === '--final-outcome' && next) {
      options.finalOutcome = next
      index += 1
      continue
    }
    if (arg === '--issue-tag' && next) {
      options.issueTag = next
      index += 1
      continue
    }
  }

  return options
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`category sample input not found: ${filePath}`)
  }

  const rawText = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  return JSON.parse(rawText)
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const payload = readJson(options.input)
  const events = Array.isArray(payload?.events) ? payload.events : payload

  const normalizedSamples = normalizeCategoryAuditSamples(events, {
    sourceType: 'audit_log',
    sourceRef: path.basename(options.input),
    idPrefix: 'AUDIT'
  })

  const filteredSamples = filterCategoryAuditSamples(normalizedSamples, {
    domain: options.domain,
    finalOutcome: options.finalOutcome,
    issueTag: options.issueTag
  })

  const markdown = buildCategorySampleLedgerMarkdown(filteredSamples)
  fs.writeFileSync(options.output, markdown, 'utf8')

  console.log(
    JSON.stringify(
      {
        input: options.input,
        output: options.output,
        totalEvents: Array.isArray(events) ? events.length : 0,
        totalSamples: normalizedSamples.length,
        exportedSamples: filteredSamples.length
      },
      null,
      2
    )
  )
}

main()
