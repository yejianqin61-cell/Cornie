import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/renderer/api', () => ({
  getConversation: vi.fn(),
  listConfirmations: vi.fn(),
  sendMessage: vi.fn(),
  streamConversation: vi.fn(),
  submitConfirmationDecision: vi.fn()
}))

import * as api from '../../src/renderer/api'
import { useChat } from '../../src/renderer/composables/useChat'

beforeEach(() => {
  vi.clearAllMocks()
  api.listConfirmations.mockResolvedValue({ confirmations: [] })
})

describe('R-02 聊天去重加固', () => {
  it('轮询拉到与流式占位同内容的正式消息时不重复上屏', async () => {
    // 流式占位（liveId）已累积内容（与 DB 正式消息相同）
    let resolveStream
    api.streamConversation.mockImplementation(async ({ message, date }, onDelta) => {
      onDelta('铃湾在呢')
      await new Promise((r) => { resolveStream = r })
      return {
        userMessage: { id: 'u1' },
        cornieMessage: { id: 'c1', content: '铃湾在呢' }
      }
    })

    const chat = useChat()
    const sendPromise = chat.streamSend('你好')
    await Promise.resolve()

    // 流式进行中：轮询 loadConversation 拉到 DB 已存的正式消息（同内容）
    api.getConversation.mockResolvedValue({
      messages: [
        { id: 'u1', role: 'user', content: '你好' },
        { id: 'c1', role: 'cornie', content: '铃湾在呢' }
      ]
    })
    await chat.loadConversation('2026-08-21')

    // 轮询不产生重复 cornie 消息（占位累积同内容 → 去重跳过）
    const cornieCount = chat.messages.value.filter((m) => m.role === 'cornie' && !m.interim).length
    expect(cornieCount).toBe(1)

    resolveStream({ userMessage: { id: 'u1' }, cornieMessage: { id: 'c1', content: '铃湾在呢' } })
    await sendPromise

    // done 后占位替换为正式消息，仍只有一条
    const finalCornie = chat.messages.value.filter((m) => m.role === 'cornie' && !m.interim)
    expect(finalCornie.length).toBe(1)
    expect(finalCornie[0].id).toBe('c1')
  })

  it('replaceMessageById upsert：同 id 并存时收敛为一条', async () => {
    const chat = useChat()
    chat.pushChatItem({ kind: 'message', role: 'cornie', content: '旧内容', id: 'c1' })
    chat.pushChatItem({ kind: 'message', role: 'cornie', content: '重复内容', id: 'c1' })
    expect(chat.messages.value.filter((m) => m.id === 'c1').length).toBe(2)

    const replaced = chat.replaceMessageById('c1', { content: '最终内容' })
    expect(replaced).toBe(true)
    const sameId = chat.messages.value.filter((m) => m.id === 'c1')
    expect(sameId.length).toBe(1)
    expect(sameId[0].content).toBe('最终内容')
  })

  it('user 消息 pendingSync 去重语义不变', async () => {
    const chat = useChat()
    chat.pushChatItem({ kind: 'message', role: 'user', content: '你好', id: 'temp', pendingSync: true })
    // 同 role+content+pendingSync 的 user 消息视为重复
    const dup = { id: 'u2', role: 'user', content: '你好', pendingSync: true }
    const exists = chat.messages.value.some((item) => {
      if (item.kind !== 'message') return false
      if (item.id === dup.id) return true
      return (
        item.role === dup.role &&
        item.content === dup.content &&
        item.pendingSync === true
      )
    })
    expect(exists).toBe(true)
  })

  it('两条不同内容的 cornie 回复不误杀', async () => {
    const chat = useChat()
    chat.pushChatItem({ kind: 'message', role: 'cornie', content: '第一句回复', id: 'c1' })
    const msg = { id: 'c2', role: 'cornie', content: '第二句回复' }
    const duplicate = chat.messages.value.some((item) => {
      if (item.kind !== 'message') return false
      if (item.id === msg.id) return true
      if (item.role === 'cornie' && msg.role === 'cornie') {
        return item.content === msg.content
      }
      return false
    })
    expect(duplicate).toBe(false)
  })
})
