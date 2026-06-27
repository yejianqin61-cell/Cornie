import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb, saveMessage } from '../electron/db.js'
import { createMemoryWikiService, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'
import { buildConversationContext } from '../electron/backend/agent/contextBuilder.js'
import { buildConversationPrompt } from '../electron/backend/agent/promptBuilder.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-context-093-'))
  const dbPath = path.join(tempRoot, 'task093.sqlite')
  const store = await openDb(dbPath)

  try {
    saveMessage(store, {
      id: 'msg-user-1',
      date: '2026-06-27',
      role: 'user',
      content: '今天我们聊到龙虾和记账'
    })

    const memoryWiki = await createMemoryWikiService({ baseDir: tempRoot })
    const topicIndex = await createTopicIndexStore(tempRoot)

    await memoryWiki.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '主人重视龙虾这个主题',
      importance: 'high',
      status: 'active',
      ownerConfirmed: true,
      body: '# 龙虾'
    })
    await topicIndex.upsert({
      keyword: '龙虾',
      dates: ['2026-06-27'],
      importance: 'high',
      note: '跨日可追溯主题'
    })

    const context = await buildConversationContext(store, {
      date: '2026-06-27',
      baseDir: tempRoot
    })
    const prompt = buildConversationPrompt({ context })

    assert.match(prompt, /长期记忆摘要/)
    assert.match(prompt, /主题索引摘要/)
    assert.match(prompt, /历史聊天命中摘要/)
    assert.match(prompt, /龙虾/)

    console.log('verify-task093-m10-context-module: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
