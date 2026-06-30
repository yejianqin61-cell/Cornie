import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { openDb, saveMessage } from '../electron/db.js'
import { buildConversationContext } from '../electron/backend/agent/contextBuilder.js'
import { buildWikiContext } from '../electron/backend/agent/wikiContext.js'
import { createObservationService } from '../electron/backend/observation/service.js'
import { OBSERVATION_PROMPT_POLICY } from '../electron/backend/observation/policy.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-observation-398-'))
  const dbPath = path.join(tempRoot, 'task398.sqlite')
  const store = await openDb(dbPath)

  try {
    const observation = createObservationService(store)
    const today = '2026-06-30'
    const yesterday = '2026-06-29'

    saveMessage(store, {
      id: 'task398-user-1',
      date: today,
      role: 'user',
      content: '我今天又提到了龙虾，而且说龙虾对我很重要。'
    })
    saveMessage(store, {
      id: 'task398-cornie-1',
      date: today,
      role: 'cornie',
      content: '小铃湾记下来了，龙虾好像对主人真的很重要。'
    })

    for (let index = 0; index < 7; index += 1) {
      observation.addNote({
        date: today,
        type: 'event',
        title: `今日观察${index + 1}`,
        content: `这是今天的观察事实 ${index + 1}`
      })
    }

    for (let index = 0; index < 4; index += 1) {
      observation.addNote({
        date: yesterday,
        type: 'event',
        title: `历史观察${index + 1}`,
        content: `这是昨天的观察事实 ${index + 1}`
      })
    }

    const context = await buildConversationContext(store, {
      date: today,
      baseDir: tempRoot
    })
    const observationSummaryLines = context.observationSummary.split('\n')
    assert.equal(
      observationSummaryLines.length,
      OBSERVATION_PROMPT_POLICY.conversationTodaySummaryLimit,
      '聊天主 prompt 只应注入限定条数的今日观察摘要'
    )
    assert.match(context.loadPolicy.matrix.injectedLayers.observationSummaryItems.toString(), /5/, '注入策略应暴露今日观察摘要边界')
    assert.equal(
      context.contextMeta.observationCount,
      OBSERVATION_PROMPT_POLICY.conversationTodaySummaryLimit,
      'contextMeta 中的 observationCount 应反映默认注入条数而不是全天总量'
    )
    assert.equal(
      context.contextMeta.observationPromptPolicy.historyInjection,
      'on_demand_only',
      '观察日志策略应明确历史观察仅按需补查'
    )

    const wikiContext = await buildWikiContext(store, {
      date: today,
      baseDir: tempRoot,
      query: '龙虾'
    })
    const recallLines = wikiContext.observationSummary.split('\n')
    assert.equal(
      recallLines.length,
      OBSERVATION_PROMPT_POLICY.wikiRecallTodayLimit,
      'wiki recall 默认只应读取限定条数的今日观察补充'
    )
    assert.doesNotMatch(
      wikiContext.observationSummary,
      /历史观察/,
      '历史观察日志不应默认进入主链 recall 摘要'
    )

    const historyRecall = observation.listByRecall({ date: yesterday, limit: 10 })
    assert.equal(historyRecall.length, 4, '历史观察日志应通过 recall 按需补查')

    const duplicateResult = observation.addNoteSmart({
      date: today,
      type: 'event',
      title: '重复事实',
      content: '主人今天说龙虾很重要'
    })
    assert.equal(duplicateResult.action, 'created')

    const mergedResult = observation.addNoteSmart({
      date: today,
      type: 'event',
      title: '重复事实',
      content: '主人今天说龙虾很重要，而且希望以后也记得'
    })
    assert.equal(mergedResult.action, 'merged', '同日相近事实应被增量合并而不是重复写入')

    const duplicateAgain = observation.addNoteSmart({
      date: today,
      type: 'event',
      title: '重复事实',
      content: '主人今天说龙虾很重要，而且希望以后也记得'
    })
    assert.equal(duplicateAgain.action, 'duplicate', '完全重复事实应被识别为 duplicate')

    console.log('verify-task398-observation-prompt-loading-boundaries: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
