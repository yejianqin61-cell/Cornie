import { logCategoryAudit } from '../category/audit.js'
import { categoryDomainRegistry } from '../category/domainRegistry.js'

export function buildCategorySummary(store) {
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

  return snapshotEntries.flatMap((item) => item.registration.formatSummaryLines(item.snapshot)).join('\n')
}
