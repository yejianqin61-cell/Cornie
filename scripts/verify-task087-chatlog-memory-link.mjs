import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { openDb, saveMessage } from '../electron/db.js'
import { createChatlogService } from '../electron/backend/chatlog/service.js'
import { createChatlogMemoryLinkService } from '../electron/backend/chatlog/memoryLink.js'
import { createMemoryWikiService } from '../electron/backend/memory-wiki/index.js'

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cornie-chatlog-087-'))
  const dbPath = path.join(tempRoot, 'task087.sqlite')
  const store = await openDb(dbPath)

  try {
    saveMessage(store, {
      id: 'msg-user-1',
      date: '2026-06-27',
      role: 'user',
      content: '今天我们聊到龙虾'
    })

    const chatlogService = createChatlogService(store)
    const memoryWikiService = await createMemoryWikiService({ baseDir: tempRoot })
    const linkService = createChatlogMemoryLinkService({ chatlogService, memoryWikiService })

    const page = await memoryWikiService.create({
      pageType: 'topic',
      title: '龙虾',
      summary: '对话中反复提及',
      body: '# 龙虾'
    })

    const linked = await linkService.linkMessageToPage({
      date: '2026-06-27',
      messageId: 'msg-user-1',
      pageId: page.pageId
    })

    assert.equal(linked.sourceRefs.length, 1)
    assert.equal(linked.sourceRefs[0].kind, 'chat')
    assert.equal(linked.sourceRefs[0].messageId, 'msg-user-1')

    const linkedAgain = await linkService.linkMessageToPage({
      date: '2026-06-27',
      messageId: 'msg-user-1',
      pageId: page.pageId
    })

    assert.equal(linkedAgain.sourceRefs.length, 1)

    console.log('verify-task087-chatlog-memory-link: ok')
  } finally {
    store.close()
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
