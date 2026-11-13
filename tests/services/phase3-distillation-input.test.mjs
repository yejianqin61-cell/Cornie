import fs from 'node:fs'
import { runMemoryDistillation } from '../../electron/backend/agent/memoryDistillation.js'
import { createMemoryWikiService } from '../../electron/backend/memory-wiki/index.js'
import { createObservationService } from '../../electron/backend/observation/service.js'
import { createMemoryWikiAuditStore } from '../../electron/backend/memory-wiki/index.js'
import { assert, createServiceHarness } from '../shared/service-harness.mjs'

const DATE = '2026-10-22'
const CURRENT_USER = 'CURRENT_USER_PREFERENCE'
const FINAL_REPLY = 'FINAL_REPLY_ACKNOWLEDGEMENT'

function count(text, marker) {
  return text.split(marker).length - 1
}

function emptyEnvelope() {
  return JSON.stringify({
    observations: [],
    identity_updates: [],
    memory_wiki_requests: [],
    reasoning: ''
  })
}

async function capturePrompt(harness, options = {}) {
  let prompt = ''
  const result = await runMemoryDistillation({
    store: harness.store,
    baseDir: harness.baseDir,
    date: DATE,
    userMessage: options.userMessage ?? CURRENT_USER,
    cornieMessage: options.cornieMessage ?? FINAL_REPLY,
    messageId: options.messageId ?? 'current-user-message',
    history: options.history ?? [],
    chatFn: async ({ messages }) => {
      prompt = String(messages[0]?.content ?? '')
      return { content: emptyEnvelope() }
    }
  })
  assert(result.decisionSource === 'llm', 'expected controlled distillation model to complete', result)
  return prompt
}

async function testFullTurnIsUniqueAndWithinBudget() {
  const harness = await createServiceHarness('phase3-distillation-input')
  try {
    const history = Array.from({ length: 11 }, (_item, index) => ({
      id: `history-${index}`,
      role: index % 2 === 0 ? 'user' : 'cornie',
      content: `HISTORY_${index}`
    }))
    history.push({ id: 'current-user-message', role: 'user', content: CURRENT_USER })

    const prompt = await capturePrompt(harness, { history })
    assert(count(prompt, CURRENT_USER) === 1, 'expected current user message once in distillation prompt', prompt)
    assert(count(prompt, FINAL_REPLY) === 1, 'expected final Cornie reply in distillation prompt', prompt)
    assert(!prompt.includes('HISTORY_0'), 'expected oldest history outside the fixed input budget', prompt)
    assert(prompt.includes('HISTORY_10'), 'expected newest retained history inside the fixed input budget', prompt)
  } finally {
    await harness.close()
  }
}

async function testEmptyFinalReplyDoesNotCreateConversationItem() {
  const harness = await createServiceHarness('phase3-distillation-empty-reply')
  try {
    const prompt = await capturePrompt(harness, { cornieMessage: '   ' })
    assert(!prompt.includes(FINAL_REPLY), 'expected empty Cornie reply to be omitted', prompt)
  } finally {
    await harness.close()
  }
}

async function testModelFailureKeepsZeroWritePolicy() {
  const harness = await createServiceHarness('phase3-distillation-model-failure')
  try {
    const result = await runMemoryDistillation({
      store: harness.store,
      baseDir: harness.baseDir,
      date: DATE,
      userMessage: CURRENT_USER,
      cornieMessage: FINAL_REPLY,
      messageId: 'failed-user-message',
      chatFn: async () => {
        const error = new Error('controlled_model_failure')
        error.code = 'controlled_model_failure'
        throw error
      }
    })
    assert(result.decisionSource === 'unavailable', 'expected model failure to keep zero-write policy', result)
    assert(result.reason === 'controlled_model_failure', 'expected model failure reason to be retained', result)
  } finally {
    await harness.close()
  }
}

async function testPromptExposesPageAndObservationIds() {
  const harness = await createServiceHarness('phase3-distillation-ids')
  try {
    const memoryWiki = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })
    const page = await memoryWiki.create({ pageType: 'event', title: '咖啡偏好', summary: '旧摘要' })
    const outcome = createObservationService(harness.store).addNoteSmart({
      date: DATE,
      type: 'event',
      title: '今日观察',
      content: '观察内容',
      sourceText: '观察内容'
    })
    const prompt = await capturePrompt(harness)
    assert(prompt.includes(`(id: ${page.pageId})`), 'expected page id in distillation prompt', prompt)
    assert(prompt.includes(`(id: ${outcome.note.id})`), 'expected observation id in distillation prompt', prompt)
  } finally {
    await harness.close()
  }
}

async function testUpdateByListedIdTakesEffect() {
  const harness = await createServiceHarness('phase3-distillation-update-listed')
  try {
    const memoryWiki = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })
    const page = await memoryWiki.create({ pageType: 'event', title: '咖啡偏好', summary: '旧摘要' })
    const result = await runMemoryDistillation({
      store: harness.store,
      baseDir: harness.baseDir,
      date: DATE,
      userMessage: CURRENT_USER,
      cornieMessage: FINAL_REPLY,
      messageId: 'update-listed-message',
      chatFn: async () => ({
        content: JSON.stringify({
          observations: [],
          identity_updates: [],
          memory_wiki_requests: [{ action: 'update_page', pageId: page.pageId, summary: '新摘要' }],
          reasoning: ''
        })
      })
    })
    assert(result.results.wikiRequests[0].action === 'updated', 'expected update by listed id', result)
    assert((await memoryWiki.get(page.pageId)).summary === '新摘要', 'expected updated summary')
  } finally {
    await harness.close()
  }
}

function envelopeStub(wikiRequests = [], observations = []) {
  return async () => ({
    content: JSON.stringify({ observations, identity_updates: [], memory_wiki_requests: wikiRequests, reasoning: '' })
  })
}

async function distill(harness, chatFn, userMessage = CURRENT_USER) {
  return runMemoryDistillation({
    store: harness.store,
    baseDir: harness.baseDir,
    date: DATE,
    userMessage,
    cornieMessage: FINAL_REPLY,
    messageId: 'reject-ids-message',
    chatFn
  })
}

async function testUpdateOutsideInputIsRejected() {
  const harness = await createServiceHarness('phase3-distillation-reject-ids')
  try {
    const memoryWiki = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })
    const before = (await memoryWiki.listSummaries({}, { hydrate: false })).length
    const ghost = await distill(harness, envelopeStub([{ action: 'update_page', pageId: 'ghost-page', summary: 'x' }]))
    const wikiResult = ghost.results.wikiRequests[0]
    assert(wikiResult.action === 'skipped', 'expected unknown page id skipped', ghost)
    assert(wikiResult.reason === 'page_id_not_in_input', 'expected page_id_not_in_input', ghost)
    assert((await memoryWiki.listSummaries({}, { hydrate: false })).length === before, 'expected no page created')

    const ghostObs = await distill(
      harness,
      envelopeStub([], [{ action: 'update', observationId: 'ghost-obs', title: 't', content: 'c' }])
    )
    assert(ghostObs.results.observations[0].reason === 'observation_id_not_in_input', 'expected obs reason', ghostObs)

    const events = await (await createMemoryWikiAuditStore(harness.baseDir)).list({ limit: 10 })
    const skipped = events.find((item) => item.eventType === 'memory_distillation' && item.details?.skipped?.wikiRequests === 1)
    assert(skipped, 'expected audit event to count the skipped wiki request', events)
  } finally {
    await harness.close()
  }
}

async function queueSize(harness) {
  const memoryWiki = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })
  return (await memoryWiki.listGovernanceRequests({ queueSection: 'memory_wiki_llm_proposals' })).length
}

async function testDestructiveProposalValidation() {
  const harness = await createServiceHarness('phase3-distillation-destructive')
  try {
    const memoryWiki = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })
    const page = await memoryWiki.create({ pageType: 'event', title: '咖啡偏好', summary: '旧摘要' })
    const other = await memoryWiki.create({ pageType: 'event', title: '茶偏好', summary: '旧摘要' })

    const queued = await distill(harness, envelopeStub([{ action: 'archive_page', pageId: page.pageId }]))
    assert(queued.results.wikiRequests[0].action === 'deferred_to_governance', 'expected archive queued', queued)
    assert((await queueSize(harness)) === 1, 'expected one queued proposal')
    const [request] = await memoryWiki.listGovernanceRequests({ queueSection: 'memory_wiki_llm_proposals' })
    assert(request.pageIds.includes(page.pageId), 'expected queued request to reference the page', request)

    const cases = [
      ['missing_required_id', { action: 'archive_page', pageId: '' }],
      ['page_id_not_in_input', { action: 'delete_page', pageId: 'ghost-page' }],
      ['version_not_found', { action: 'rollback_page', pageId: page.pageId, versionId: 'ver_missing' }],
      ['missing_required_id', { action: 'merge_pages', targetPageId: page.pageId, sourcePageId: page.pageId }]
    ]
    for (const [reason, proposal] of cases) {
      const result = await distill(harness, envelopeStub([proposal]))
      assert(result.results.wikiRequests[0].reason === reason, `expected ${reason} for ${proposal.action}`, result)
    }
    assert((await queueSize(harness)) === 1, 'expected rejected proposals not to be queued')

    const mergeOk = await distill(
      harness,
      envelopeStub([{ action: 'merge_pages', targetPageId: page.pageId, sourcePageId: other.pageId }])
    )
    assert(mergeOk.results.wikiRequests[0].action === 'deferred_to_governance', 'expected valid merge queued', mergeOk)

    // 索引仍列出、文件已缺失的坏页（从未被缓存）：校验应判为 page_not_found
    const broken = await memoryWiki.create({ pageType: 'event', title: '坏页', summary: '坏' })
    fs.rmSync(broken.filePath, { force: true })
    const gone = await distill(harness, envelopeStub([{ action: 'archive_page', pageId: broken.pageId }]))
    assert(gone.results.wikiRequests[0].reason === 'page_not_found', 'expected page_not_found', gone)
  } finally {
    await harness.close()
  }
}

async function captureWith(harness, userMessage) {
  let prompt = ''
  const result = await distill(
    harness,
    async ({ messages }) => {
      prompt = String(messages[0]?.content ?? '')
      return { content: emptyEnvelope() }
    },
    userMessage
  )
  return { prompt, result }
}

async function createAlphaPages(memoryWiki, count, overrides = {}, prefix = 'Alpha') {
  const pages = []
  for (let i = 1; i <= count; i += 1) {
    pages.push(await memoryWiki.create({ pageType: 'event', title: `${prefix}${i}`, summary: `s${i}`, ...overrides[i] }))
  }
  return pages
}

async function testRecallPicksRelevantPages() {
  const harness = await createServiceHarness('phase3-distillation-recall')
  try {
    const memoryWiki = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })
    await createAlphaPages(memoryWiki, 7, {}, '阿页')
    const coffee = await memoryWiki.create({ pageType: 'event', title: '咖啡偏好', summary: '喜欢拿铁' })
    const { prompt } = await captureWith(harness, '最近又开始喝咖啡了')
    assert(prompt.includes(`(id: ${coffee.pageId})`), 'expected the relevant page to be recalled', prompt)
    assert(prompt.includes('咖啡偏好 (id: ' + coffee.pageId + ')：喜欢拿铁'), 'expected hydrated summary', prompt)
    const listed = prompt.split(String.fromCharCode(10)).filter((line) => line.startsWith('- [event]')).length
    assert(listed <= 6, 'expected at most 6 listed pages', listed)
  } finally {
    await harness.close()
  }
}

async function testRecallFallsBackToImportance() {
  const harness = await createServiceHarness('phase3-distillation-recall-fallback')
  try {
    const memoryWiki = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })
    const pages = await createAlphaPages(memoryWiki, 8, { 8: { importance: 'critical' } })
    const { prompt } = await captureWith(harness, 'zzzz')
    assert(prompt.includes(`(id: ${pages[7].pageId})`), 'expected the most important page when nothing matches', prompt)
    assert(prompt.split(String.fromCharCode(10)).filter((line) => line.startsWith('- [event]')).length === 6, 'expected 6 listed pages')
  } finally {
    await harness.close()
  }
}

async function testRecallSurvivesBrokenPage() {
  const harness = await createServiceHarness('phase3-distillation-recall-broken')
  try {
    const memoryWiki = await createMemoryWikiService({ baseDir: harness.baseDir, store: harness.store })
    const pages = await createAlphaPages(memoryWiki, 5)
    fs.rmSync(pages[2].filePath, { force: true })
    const { result } = await captureWith(harness, 'Alpha3 怎么样')
    assert(result.decisionSource === 'llm', 'expected distillation to survive a broken page', result)
  } finally {
    await harness.close()
  }
}

await testFullTurnIsUniqueAndWithinBudget()
await testRecallPicksRelevantPages()
await testRecallFallsBackToImportance()
await testRecallSurvivesBrokenPage()
await testDestructiveProposalValidation()
await testUpdateOutsideInputIsRejected()
await testPromptExposesPageAndObservationIds()
await testUpdateByListedIdTakesEffect()
await testEmptyFinalReplyDoesNotCreateConversationItem()
await testModelFailureKeepsZeroWritePolicy()
console.log('tests/services/phase3-distillation-input.test.mjs: passed 10/10')
