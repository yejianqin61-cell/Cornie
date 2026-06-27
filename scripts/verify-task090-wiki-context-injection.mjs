import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb, saveMessage } from '../electron/db.js'
import { createMemoryWikiService, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'
import { buildConversationContext } from '../electron/backend/agent/contextBuilder.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-context-090-'))
  const dbPath = path.join(tempRoot, 'task090.sqlite')
  const store = await openDb(dbPath)

  try {
    saveMessage(store, {
      id: 'msg-user-1',
      date: '2026-06-27',
      role: 'user',
      content: '今天我们聊到龙虾'
    })

    const memoryWiki = await createMemoryWikiService({ baseDir: tempRoot })
    const topicIndex = await createTopicIndexStore(tempRoot)

    await memoryWiki.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '主人会反复提到龙虾',
      importance: 'high',
      status: 'active',
      ownerConfirmed: true,
      body: '# 龙虾'
    })
    await memoryWiki.create({
      pageType: 'topic',
      title: '过期主题',
      summary: '这页已归档',
      importance: 'critical',
      status: 'archived',
      body: '# 归档'
    })

    await topicIndex.upsert({
      keyword: '龙虾',
      dates: ['2026-06-27'],
      importance: 'high',
      note: '聊天中经常出现'
    })

    const context = await buildConversationContext(store, {
      date: '2026-06-27',
      baseDir: tempRoot
    })

    assert.match(context.memorySummary, /龙虾/)
    assert.doesNotMatch(context.memorySummary, /过期主题/)
    assert.match(context.topicSummary, /聊天中经常出现/)
    assert.match(context.chatRecallSummary, /2026-06-27/)

    console.log('verify-task090-wiki-context-injection: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
