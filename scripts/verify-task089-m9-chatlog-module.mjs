import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb, saveMessage } from '../electron/db.js'
import { createChatlogService } from '../electron/backend/chatlog/service.js'
import { createChatlogMemoryLinkService } from '../electron/backend/chatlog/memoryLink.js'
import { createChatlogTopicLinkService } from '../electron/backend/chatlog/topicLink.js'
import { createMemoryWikiService, createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-chatlog-089-'))
  const dbPath = path.join(tempRoot, 'task089.sqlite')
  const store = await openDb(dbPath)

  try {
    saveMessage(store, {
      id: 'msg-user-1',
      date: '2026-06-27',
      role: 'user',
      content: '今天我们聊到龙虾'
    })
    saveMessage(store, {
      id: 'msg-cornie-1',
      date: '2026-06-27',
      role: 'cornie',
      content: '铃湾记住龙虾啦'
    })

    const chatlogService = createChatlogService(store)
    const memoryWikiService = await createMemoryWikiService({ baseDir: tempRoot })
    const topicIndex = await createTopicIndexStore(tempRoot)
    const memoryLink = createChatlogMemoryLinkService({ chatlogService, memoryWikiService })
    const topicLink = createChatlogTopicLinkService({ chatlogService, topicIndex })

    const page = await memoryWikiService.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '聊天里的重要主题',
      body: '# 龙虾'
    })

    const linkedPage = await memoryLink.linkMessageToPage({
      date: '2026-06-27',
      messageId: 'msg-user-1',
      pageId: page.pageId
    })
    assert.equal(linkedPage.sourceRefs.length, 1)

    const linkedTopic = await topicLink.linkMessageToTopic({
      date: '2026-06-27',
      messageId: 'msg-user-1',
      keyword: '龙虾',
      aliases: ['lobster'],
      importance: 'high',
      pageId: page.pageId
    })

    assert.deepEqual(linkedTopic?.dates, ['2026-06-27'])
    assert.deepEqual(linkedTopic?.chatRefs, ['2026-06-27#msg-user-1'])
    assert.deepEqual(linkedTopic?.memoryPageIds, [page.pageId])

    const search = chatlogService.searchDatesByKeyword('龙虾')
    assert.equal(search.entries.length, 1)
    assert.equal(search.entries[0].matchedCount, 2)

    console.log('verify-task089-m9-chatlog-module: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
