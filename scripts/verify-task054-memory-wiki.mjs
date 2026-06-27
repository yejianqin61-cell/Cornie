import assert from 'node:assert/strict'
import {
  MEMORY_WIKI_PAGE_TYPES,
  buildPageId,
  buildPageSlug,
  createDefaultPageMetadata,
  createPageModel,
  getPageDirectoryName,
  resolveMemoryWikiIndexRoot,
  resolveMemoryWikiPagesRoot,
  resolveMemoryWikiRoot
} from '../electron/backend/memory-wiki/index.js'

function main() {
  assert.ok(MEMORY_WIKI_PAGE_TYPES.includes('topic'))
  assert.equal(getPageDirectoryName('topic'), 'topics')
  assert.equal(getPageDirectoryName('person'), 'people')

  const slug = buildPageSlug({ title: '龙虾 对 我 很 重要!!!' })
  assert.equal(slug, '龙虾-对-我-很-重要')

  const metadata = createDefaultPageMetadata({
    pageType: 'topic',
    title: '龙虾',
    aliases: ['小龙虾', 'lobster']
  })
  assert.equal(metadata.pageType, 'topic')
  assert.equal(metadata.title, '龙虾')
  assert.equal(metadata.slug, '龙虾')
  assert.deepEqual(metadata.aliases, ['小龙虾', 'lobster'])
  assert.equal(metadata.status, 'draft')
  assert.equal(metadata.ownerConfirmed, false)
  assert.ok(metadata.pageId.startsWith('topic_龙虾_'))

  const model = createPageModel({
    pageType: 'project',
    title: 'Cornie Product',
    summary: '长期项目',
    body: '## 这是什么\nCornie'
  })
  assert.equal(model.directoryName, 'projects')
  assert.equal(model.filename, 'cornie-product.md')
  assert.equal(model.body, '## 这是什么\nCornie')

  assert.ok(resolveMemoryWikiRoot(process.cwd()).endsWith('data\\memory-wiki'))
  assert.ok(resolveMemoryWikiPagesRoot(process.cwd()).endsWith('data\\memory-wiki\\pages'))
  assert.ok(resolveMemoryWikiIndexRoot(process.cwd()).endsWith('data\\memory-wiki\\index'))

  const manualPageId = buildPageId({ pageType: 'goal', slug: 'daily-ledger', pageId: 'goal_daily-ledger_fixed' })
  assert.equal(manualPageId, 'goal_daily-ledger_fixed')

  console.log('verify-task054-memory-wiki: ok')
}

main()
