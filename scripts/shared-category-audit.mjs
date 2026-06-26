import {
  listLedgerCategories,
  listLedgerEntries,
  listScheduleCategories,
  listScheduleEntries,
  listTodoCategories,
  listTodoEntries
} from '../electron/db.js'

function normalizeCompareValue(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim()
}

function buildDuplicateCategoryIssues(domain, categories, options = {}) {
  const seen = new Map()
  const issues = []

  for (const category of categories) {
    const normalizedName = normalizeCompareValue(category.name)
    if (!normalizedName) {
      continue
    }

    const key = options.typeAware && category.type ? `${category.type}:${normalizedName}` : normalizedName
    const previous = seen.get(key)
    if (!previous) {
      seen.set(key, category)
      continue
    }

    issues.push({
      kind: 'duplicate_category_name',
      severity: 'medium',
      domain,
      entryTable: null,
      entryId: null,
      categoryId: category.id,
      categoryName: category.name,
      expectedCategoryId: previous.id,
      reason: `同域检测到重复类目名：${previous.name}`,
      details: {
        duplicateOf: previous.id,
        duplicateOfName: previous.name,
        type: category.type ?? null
      }
    })
  }

  return issues
}

function buildOrphanReferenceIssues(domain, categories, entries, entryType) {
  const categoryMap = new Map(categories.map((item) => [item.id, item]))
  const issues = []

  for (const entry of entries) {
    if (!entry.categoryId) {
      continue
    }

    const category = categoryMap.get(entry.categoryId)
    if (!category) {
      issues.push({
        kind: 'missing_category_reference',
        severity: 'high',
        domain,
        entryTable: entryType,
        entryId: entry.id,
        categoryId: entry.categoryId,
        categoryName: entry.categoryName ?? null,
        expectedCategoryId: null,
        reason: '业务记录引用了不存在的 categoryId',
        details: {
          title: entry.title ?? entry.item ?? null
        }
      })
      continue
    }

    if (entry.categoryName && entry.categoryName !== category.name) {
      issues.push({
        kind: 'category_name_mismatch',
        severity: 'low',
        domain,
        entryTable: entryType,
        entryId: entry.id,
        categoryId: entry.categoryId,
        categoryName: entry.categoryName,
        expectedCategoryId: category.id,
        reason: '业务记录 categoryName 与类目表当前名称不一致',
        details: {
          expectedCategoryName: category.name,
          title: entry.title ?? entry.item ?? null
        }
      })
    }
  }

  return issues
}

function buildGenericCategoryOveruseIssues(domain, entries, genericNames, threshold = 0.4) {
  const eligibleEntries = entries.filter((entry) => entry.categoryName)
  if (eligibleEntries.length === 0) {
    return []
  }

  const genericEntries = eligibleEntries.filter((entry) => genericNames.has(entry.categoryName))
  const ratio = genericEntries.length / eligibleEntries.length
  if (ratio < threshold) {
    return []
  }

  return [
    {
      kind: 'generic_category_overuse',
      severity: 'medium',
      domain,
      entryTable: 'summary',
      entryId: null,
      categoryId: null,
      categoryName: null,
      expectedCategoryId: null,
      reason: `泛化类目占比偏高：${genericEntries.length}/${eligibleEntries.length}`,
      details: {
        ratio: Number(ratio.toFixed(2)),
        genericNames: [...genericNames],
        sampleEntryIds: genericEntries.slice(0, 5).map((entry) => entry.id)
      }
    }
  ]
}

export function buildAuditReport(store, dbPath) {
  const ledgerCategories = [
    ...listLedgerCategories(store, { type: 'expense', activeOnly: false }),
    ...listLedgerCategories(store, { type: 'income', activeOnly: false })
  ]
  const todoCategories = listTodoCategories(store, { activeOnly: false })
  const scheduleCategories = listScheduleCategories(store, { activeOnly: false })

  const ledgerEntries = listLedgerEntries(store, {})
  const todoEntries = listTodoEntries(store, {})
  const scheduleEntries = listScheduleEntries(store, {})

  const issues = [
    ...buildDuplicateCategoryIssues('ledger', ledgerCategories, { typeAware: true }),
    ...buildDuplicateCategoryIssues('todo', todoCategories),
    ...buildDuplicateCategoryIssues('schedule', scheduleCategories),
    ...buildOrphanReferenceIssues('ledger', ledgerCategories, ledgerEntries, 'ledger_entries'),
    ...buildOrphanReferenceIssues('todo', todoCategories, todoEntries, 'todo_entries'),
    ...buildOrphanReferenceIssues('schedule', scheduleCategories, scheduleEntries, 'schedule_entries'),
    ...buildGenericCategoryOveruseIssues('todo', todoEntries, new Set(['待办'])),
    ...buildGenericCategoryOveruseIssues('schedule', scheduleEntries, new Set(['日程', '提醒'])),
    ...buildGenericCategoryOveruseIssues('ledger', ledgerEntries, new Set(['其他', '其它']))
  ]

  const summary = {
    dbPath,
    scannedAt: new Date().toISOString(),
    totals: {
      categories: {
        ledger: ledgerCategories.length,
        todo: todoCategories.length,
        schedule: scheduleCategories.length
      },
      entries: {
        ledger: ledgerEntries.length,
        todo: todoEntries.length,
        schedule: scheduleEntries.length
      },
      issues: issues.length
    },
    issuesByKind: issues.reduce((accumulator, issue) => {
      accumulator[issue.kind] = (accumulator[issue.kind] ?? 0) + 1
      return accumulator
    }, {}),
    issuesByDomain: issues.reduce((accumulator, issue) => {
      accumulator[issue.domain] = (accumulator[issue.domain] ?? 0) + 1
      return accumulator
    }, {})
  }

  return {
    summary,
    issues
  }
}

export function formatAuditReportMarkdown(report) {
  const lines = [
    '# 类目脏数据巡检报告',
    '',
    `- 扫描时间：${report.summary.scannedAt}`,
    `- 数据库：${report.summary.dbPath}`,
    `- 问题总数：${report.summary.totals.issues}`,
    '',
    '## 汇总',
    '',
    '| 域 | 类目数 | 记录数 | 问题数 |',
    '| --- | --- | --- | --- |',
    `| ledger | ${report.summary.totals.categories.ledger} | ${report.summary.totals.entries.ledger} | ${report.summary.issuesByDomain.ledger ?? 0} |`,
    `| todo | ${report.summary.totals.categories.todo} | ${report.summary.totals.entries.todo} | ${report.summary.issuesByDomain.todo ?? 0} |`,
    `| schedule | ${report.summary.totals.categories.schedule} | ${report.summary.totals.entries.schedule} | ${report.summary.issuesByDomain.schedule ?? 0} |`,
    '',
    '## 问题明细',
    '',
    '| 类型 | 域 | 记录表 | 记录ID | 类目ID | 原因 |',
    '| --- | --- | --- | --- | --- | --- |'
  ]

  for (const issue of report.issues) {
    lines.push(
      `| ${issue.kind} | ${issue.domain} | ${issue.entryTable ?? '-'} | ${issue.entryId ?? '-'} | ${issue.categoryId ?? '-'} | ${issue.reason} |`
    )
  }

  return lines.join('\n')
}
