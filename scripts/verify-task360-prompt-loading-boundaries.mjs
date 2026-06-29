import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

import { openDb, saveMessage } from '../electron/db.js'
import { createObservationService } from '../electron/backend/observation/service.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'
import { buildConversationContext, CONVERSATION_CONTEXT_BUDGETS } from '../electron/backend/agent/contextBuilder.js'
import { buildConversationPrompt } from '../electron/backend/agent/promptBuilder.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-context-360-'))
  const dbPath = path.join(tempRoot, 'task360.sqlite')
  const store = await openDb(dbPath)

  try {
    for (let i = 1; i <= 12; i += 1) {
      saveMessage(store, {
        id: `msg-user-${i}`,
        date: '2026-06-30',
        role: i % 2 === 0 ? 'cornie' : 'user',
        content: `第${i}条测试消息，包含项目、压力、人物与普通闲聊内容 ${i}`
      })
    }

    const observation = createObservationService(store)
    for (let i = 1; i <= 8; i += 1) {
      observation.addNote({
        date: '2026-06-30',
        type: 'event',
        title: `观察${i}`,
        content: `这是第${i}条观察记录`
      })
    }

    const memoryWiki = await createMemoryWikiService({ baseDir: tempRoot, store })
    await memoryWiki.create({
      pageType: 'identity_profile',
      title: '叶健钦',
      userName: '叶健钦',
      preferredName: '爸爸',
      cornieRelationship: '用户是 Cornie 的爸爸',
      identitySummary: '当前处于学业与项目并行推进阶段。',
      currentFocus: '项目推进、考试与学业',
      stressors: '项目推进压力、考试与学业压力',
      communicationPreference: '偏好温柔表达；希望被稳定记住上下文',
      importance: 'critical',
      status: 'active'
    })
    await memoryWiki.create({
      pageType: 'identity_person',
      title: '钟奕菲',
      personName: '钟奕菲',
      relationshipToUser: '初恋',
      sharedExperienceSummary: '2021年冬天相恋，2022年夏天决裂',
      importance: 'high',
      status: 'active'
    })

    const context = await buildConversationContext(store, {
      date: '2026-06-30',
      baseDir: tempRoot
    })

    assert.deepEqual(context.loadPolicy.defaultInjectedLayers, [
      'recent_conversation_summary',
      'category_summary',
      'todo_summary',
      'schedule_summary',
      'today_observation_summary',
      'memory_summary',
      'topic_summary',
      'tool_summary'
    ])
    assert.deepEqual(context.loadPolicy.recallOnlyLayers, [
      'chat_recall_summary',
      'observation_recall_summary'
    ])
    assert.equal(context.loadPolicy.budgets.observationSummaryItems, CONVERSATION_CONTEXT_BUDGETS.observationSummaryItems)

    const observationLines = context.observationSummary.split('\n').filter(Boolean)
    assert.equal(observationLines.length, CONVERSATION_CONTEXT_BUDGETS.observationSummaryItems, '今日观察摘要应遵守固定条数预算')

    const recentLines = context.recentConversationSummary.split('\n').filter(Boolean)
    assert.equal(recentLines.length, CONVERSATION_CONTEXT_BUDGETS.recentConversationMessages, '最近对话摘要应遵守固定条数预算')

    assert.equal(context.contextMeta.chatRecallHitCount, 0, '无 query 命中时不应默认引入历史聊天补查结果')
    assert.equal(context.contextMeta.observationRecallHitCount, 3, '观察补查层应维持固定补查预算')

    const prompt = buildConversationPrompt({ context })
    assert.match(prompt, /上下文装载边界：/, '主 prompt 应显式说明装载边界')
    assert.match(prompt, /默认注入层：/, '主 prompt 应说明默认注入层')
    assert.match(prompt, /仅补查层：/, '主 prompt 应说明补查层')
    assert.match(prompt, /预算：/, '主 prompt 应说明预算信息')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
