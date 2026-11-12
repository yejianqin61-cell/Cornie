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

async function distill(harness, chatFn) {
  return runMemoryDistillation({
    store: harness.store,
    baseDir: harness.baseDir,
    date: DATE,
    userMessage: CURRENT_USER,
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

await testFullTurnIsUniqueAndWithinBudget()
await testUpdateOutsideInputIsRejected()
await testPromptExposesPageAndObservationIds()
await testUpdateByListedIdTakesEffect()
await testEmptyFinalReplyDoesNotCreateConversationItem()
await testModelFailureKeepsZeroWritePolicy()
console.log('tests/services/phase3-distillation-input.test.mjs: passed 6/6')
