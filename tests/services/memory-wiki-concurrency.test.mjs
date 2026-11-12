import { getSharedWriterQueue } from '../../electron/backend/memory-wiki/writeQueue.js'
import { createMemoryWikiService } from '../../electron/backend/memory-wiki/index.js'
import { assert, createServiceHarness } from '../shared/service-harness.mjs'

async function createTwoInstances(harness) {
  const a = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })
  const b = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })
  return [a, b]
}

async function testConcurrentPageCreates() {
  const harness = await createServiceHarness('memory-wiki-concurrency-pages')
  try {
    const instances = await createTwoInstances(harness)
    await Promise.all(
      Array.from({ length: 20 }, (_item, i) =>
        instances[i % 2].create({ pageType: 'event', title: `并发页${i}`, summary: `s${i}` })
      )
    )
    const pages = await instances[0].list({})
    assert(pages.length === 20, 'expected all 20 pages in the index across instances', pages.length)
  } finally {
    await harness.close()
  }
}

async function testConcurrentGovernanceRequests() {
  const harness = await createServiceHarness('memory-wiki-concurrency-governance')
  try {
    const instances = await createTwoInstances(harness)
    await Promise.all(
      Array.from({ length: 20 }, (_item, i) =>
        instances[i % 2].createGovernanceRequest({
          requestType: 'concurrency_test',
          queueSection: 'concurrency_test',
          riskLevel: 'low',
          title: `req-${i}`,
          reason: '并发写入测试'
        })
      )
    )
    const queue = await instances[0].listGovernanceRequests({ queueSection: 'concurrency_test' })
    assert(queue.length === 20, 'expected all 20 governance requests across instances', queue.length)
  } finally {
    await harness.close()
  }
}

async function createTenPages(instance) {
  const pages = []
  for (let i = 0; i < 10; i += 1) {
    pages.push(await instance.create({ pageType: 'event', title: `预置页${i}`, summary: `s${i}` }))
  }
  return pages
}

async function testConcurrentTopicLinks() {
  const harness = await createServiceHarness('memory-wiki-concurrency-topic')
  try {
    const instances = await createTwoInstances(harness)
    const pages = await createTenPages(instances[0])
    await Promise.all(
      pages.map((page, i) => instances[i % 2].getTopicIndex().linkPage('并发主题', page.pageId))
    )
    const topic = await instances[0].getTopicIndex().get('并发主题')
    assert((topic?.memoryPageIds ?? []).length === 10, 'expected all 10 pages linked to the topic', topic)
  } finally {
    await harness.close()
  }
}

async function testConcurrentVersionSnapshots() {
  const harness = await createServiceHarness('memory-wiki-concurrency-versions')
  try {
    const instances = await createTwoInstances(harness)
    const pages = await createTenPages(instances[0])
    await Promise.all(
      pages.map((page, i) => instances[i % 2].updateSummary(page.pageId, `更新${i}`))
    )
    for (const page of pages) {
      const versions = await instances[0].listVersions(page.pageId)
      assert(versions.length === 1, `expected exactly one version for ${page.pageId}`, versions.length)
    }
  } finally {
    await harness.close()
  }
}

function testQueueKeyIgnoresCaseOnWindows() {
  if (process.platform !== 'win32') return
  const lower = getSharedWriterQueue('C:\Cornie-Case-Test\index.json')
  const upper = getSharedWriterQueue('c:\CORNIE-CASE-TEST\INDEX.JSON')
  assert(lower === upper, 'expected paths differing only by case to share one queue')
}

await testConcurrentPageCreates()
await testConcurrentGovernanceRequests()
await testConcurrentTopicLinks()
await testConcurrentVersionSnapshots()
testQueueKeyIgnoresCaseOnWindows()
console.log('tests/services/memory-wiki-concurrency.test.mjs: passed 5/5')
