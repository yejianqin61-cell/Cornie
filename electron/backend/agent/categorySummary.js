import { logCategoryAudit } from '../category/audit.js'
import { categoryDomainRegistry } from '../category/domainRegistry.js'

function countSnapshotItems(snapshot) {
  if (Array.isArray(snapshot)) {
    return snapshot.length
  }

  if (snapshot && typeof snapshot === 'object') {
    return Object.values(snapshot).reduce((total, value) => {
      if (Array.isArray(value)) {
        return total + value.length
      }
      return total
    }, 0)
  }

  return 0
}

export function buildCategorySummaryPayload(store) {
  const snapshotEntries = categoryDomainRegistry.listDomains().map((domain) => {
    const registration = categoryDomainRegistry.getDomain(domain)
    return {
      domain,
      snapshot: registration.getCategorySnapshot(store),
      registration
    }
  })

  logCategoryAudit({
    eventType: 'category_snapshot_built',
    decision: 'mapped',
    reason: snapshotEntries
      .map((item) => item.registration.summarizeSnapshotForAudit(item.snapshot))
      .join(', ')
  })

  const lines = snapshotEntries.flatMap((item) => item.registration.formatSummaryLines(item.snapshot))
  return {
    text: lines.join('\n'),
    counts: snapshotEntries.reduce((accumulator, item) => {
      accumulator[item.domain] = countSnapshotItems(item.snapshot)
      return accumulator
    }, {})
  }
}

export function buildCategorySummary(store) {
  return buildCategorySummaryPayload(store).text
}
