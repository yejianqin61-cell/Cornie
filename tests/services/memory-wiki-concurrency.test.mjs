import { atomicWriteFile } from '../../electron/backend/persistence/atomicWrite.js'
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

function withTimeout(promise, label, ms = 10000) {
  let timer
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out (possible deadlock): ${label}`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function createSixPages(instance) {
  const pages = []
  for (let i = 1; i <= 6; i += 1) {
    pages.push(await instance.create({ pageType: 'event', title: `组合页${i}`, summary: `s${i}` }))
  }
  return pages
}

async function testCompositeOperationsAcrossInstances() {
  const harness = await createServiceHarness('memory-wiki-concurrency-composite')
  try {
    const [a, b] = await createTwoInstances(harness)
    const pages = await createSixPages(a)
    await Promise.all([
      withTimeout(a.mergePages({ targetPageId: pages[0].pageId, sourcePageId: pages[1].pageId }), 'merge'),
      withTimeout(b.delete(pages[2].pageId), 'delete'),
      withTimeout(b.linkPageToTopic({ pageId: pages[3].pageId, keyword: '并发主题' }), 'link topic')
    ])
    const listed = await a.list({})
    assert(listed.length === 5, 'expected 5 pages after deleting one', listed.length)
    assert((await a.get(pages[1].pageId)).status === 'archived', 'expected merged source archived')
    const topic = await a.getTopicIndex().get('并发主题')
    assert((topic?.memoryPageIds ?? []).includes(pages[3].pageId), 'expected page linked to the topic', topic)
  } finally {
    await harness.close()
  }
}

async function testOppositeMergesAcrossInstances() {
  const harness = await createServiceHarness('memory-wiki-concurrency-opposite-merge')
  try {
    const [a, b] = await createTwoInstances(harness)
    const pages = await createSixPages(a)
    await Promise.allSettled([
      withTimeout(a.mergePages({ targetPageId: pages[4].pageId, sourcePageId: pages[5].pageId }), 'merge 5->6'),
      withTimeout(b.mergePages({ targetPageId: pages[5].pageId, sourcePageId: pages[4].pageId }), 'merge 6->5')
    ]).then((results) => {
      for (const result of results) {
        assert(
          result.status === 'fulfilled' || !String(result.reason?.message).includes('timed out'),
          'expected opposite merges to finish without deadlock',
          result
        )
      }
    })
    const listed = await a.list({})
    assert(listed.length === 6, 'expected the index to stay intact with 6 pages', listed.length)
  } finally {
    await harness.close()
  }
}

async function testAtomicWriteRetriesTransientRenameErrors() {
  let attempts = 0
  const written = []
  const options = {
    writeFile: async () => {},
    remove: async () => {},
    rename: async () => {
      attempts += 1
      if (attempts < 3) {
        const error = new Error('locked')
        error.code = 'EPERM'
        throw error
      }
      written.push('renamed')
    }
  }
  await atomicWriteFile('ignored.json', '{}', options)
  assert(attempts === 3 && written.length === 1, 'expected two transient failures then success', attempts)

  let calls = 0
  let failure = null
  try {
    await atomicWriteFile('ignored.json', '{}', {
      ...options,
      rename: async () => {
        calls += 1
        const error = new Error('denied')
        error.code = 'EACCES'
        throw error
      }
    })
  } catch (error) {
    failure = error
  }
  assert(failure?.code === 'EACCES' && calls === 1, 'expected non-transient errors not to be retried', calls)
}

function testQueueKeyIgnoresCaseOnWindows() {
  if (process.platform !== 'win32') return
  const lower = getSharedWriterQueue('C:/Cornie-Case-Test/index.json')
  const upper = getSharedWriterQueue('c:/CORNIE-CASE-TEST/INDEX.JSON')
  assert(lower === upper, 'expected paths differing only by case to share one queue')
}

await testConcurrentPageCreates()
await testConcurrentGovernanceRequests()
await testConcurrentTopicLinks()
await testConcurrentVersionSnapshots()
await testCompositeOperationsAcrossInstances()
await testOppositeMergesAcrossInstances()
await testAtomicWriteRetriesTransientRenameErrors()
testQueueKeyIgnoresCaseOnWindows()
console.log('tests/services/memory-wiki-concurrency.test.mjs: passed 8/8')
