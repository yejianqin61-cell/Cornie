import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb, saveMessage } from '../electron/db.js'
import { createChatlogService } from '../electron/backend/chatlog/service.js'
import { createChatlogTopicLinkService } from '../electron/backend/chatlog/topicLink.js'
import { createTopicIndexStore } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-chatlog-088-'))
  const dbPath = path.join(tempRoot, 'task088.sqlite')
  const store = await openDb(dbPath)

  try {
    saveMessage(store, {
      id: 'msg-user-1',
      date: '2026-06-27',
      role: 'user',
      content: '今天我们聊到龙虾'
    })

    const chatlogService = createChatlogService(store)
    const topicIndex = await createTopicIndexStore(tempRoot)
    const linkService = createChatlogTopicLinkService({ chatlogService, topicIndex })

    const item = await linkService.linkMessageToTopic({
      date: '2026-06-27',
      messageId: 'msg-user-1',
      keyword: '龙虾',
      aliases: ['lobster'],
      importance: 'high',
      note: '聊天中反复出现',
      pageId: 'topic_lobster'
    })

    assert.equal(item?.normalizedKey, '龙虾')
    assert.deepEqual(item?.dates, ['2026-06-27'])
    assert.deepEqual(item?.chatRefs, ['2026-06-27#msg-user-1'])
    assert.deepEqual(item?.memoryPageIds, ['topic_lobster'])
    assert.equal(item?.importance, 'high')

    console.log('verify-task088-chatlog-topic-link: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
