import { createMemoryWikiService } from '../../electron/backend/memory-wiki/service.js'
import { loadDemoMemorySet } from '../../electron/backend/memory-wiki/demoMemory.js'
import { assert, createServiceHarness } from '../shared/service-harness.mjs'

async function testResettableDemoMemorySet() {
  const harness = await createServiceHarness('phase3-demo-memory')
  try {
    const first = await loadDemoMemorySet({ baseDir: harness.baseDir, store: harness.store })
    assert(first.createdCount === 4, 'expected initial demo loader to create four pages', first)

    const second = await loadDemoMemorySet({ baseDir: harness.baseDir, store: harness.store })
    assert(second.createdCount === 0, 'expected repeated demo loader to be idempotent', second)

    const memoryWiki = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })
    const pages = await memoryWiki.listSummaries({})
    assert(pages.length === 4, 'expected exactly four demo memory pages', pages)
    assert(pages.some((item) => item.pageType === 'identity_person'), 'expected a person page', pages)
    assert(pages.some((item) => item.pageType === 'identity_preference'), 'expected a preference page', pages)
    assert(pages.some((item) => item.pageType === 'event'), 'expected an event page', pages)
    assert(pages.some((item) => item.pageType === 'topic'), 'expected a conflict topic page', pages)
  } finally {
    await harness.close()
  }
}

await testResettableDemoMemorySet()
console.log('tests/services/phase3-demo-memory.test.mjs: passed 1/1')
