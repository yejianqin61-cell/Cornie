import { runMemoryDistillation } from '../../electron/backend/agent/memoryDistillation.js'
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

await testFullTurnIsUniqueAndWithinBudget()
await testEmptyFinalReplyDoesNotCreateConversationItem()
await testModelFailureKeepsZeroWritePolicy()
console.log('tests/services/phase3-distillation-input.test.mjs: passed 3/3')
