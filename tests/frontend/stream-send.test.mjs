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
})

describe('FE-03 流式发送与发送收敛', () => {
  it('streamSend 逐字增量渲染并最终替换为正式消息', async () => {
    let resolveStream
    api.streamConversation.mockImplementation(async ({ message: _message, date: _date }, onDelta) => {
      onDelta('第')
      await new Promise((r) => {
        resolveStream = r
      })
      onDelta('一')
      return {
        userMessage: { id: 'u1' },
        cornieMessage: { id: 'c1', content: '第一句回复' }
      }
    })

    const chat = useChat()
    const promise = chat.streamSend('你好')
    await Promise.resolve()

    // 增量中：streaming 占位已累积第一段
    const live = chat.messages.value.find((m) => m.streaming)
    expect(live).toBeDefined()
    expect(live.content).toBe('第')

    resolveStream()
    await promise

    // 占位被替换为正式消息
    const cornie = chat.messages.value.find(
      (m) => m.kind === 'message' && m.role === 'cornie' && !m.interim
    )
    expect(cornie).toMatchObject({ id: 'c1', content: '第一句回复', streaming: false })
    expect(chat.messages.value.some((m) => m.streaming)).toBe(false)
  })

  it('streamSend 上屏层间话语与工具结果（与 appendResponse 共用）', async () => {
    api.streamConversation.mockResolvedValue({
      userMessage: { id: 'u1' },
      interimReplies: ['我先翻翻今天的事'],
      cornieMessage: { id: 'c1', content: '回复' },
      toolExecution: { used: true, results: [{ label: '查了日历' }] }
    })

    const chat = useChat()
    await chat.streamSend('hi')

    expect(chat.messages.value.some((m) => m.interim && m.content === '我先翻翻今天的事')).toBe(true)
    expect(chat.messages.value.some((m) => m.kind === 'tool_result')).toBe(true)
  })

  it('streamSend 失败回退为错误占位文案', async () => {
    api.streamConversation.mockRejectedValue(new Error('boom'))
    const chat = useChat()
    const data = await chat.streamSend('hi')

    expect(data).toBeNull()
    const cornie = chat.messages.value.find(
      (m) => m.kind === 'message' && m.role === 'cornie' && !m.interim
    )
    expect(cornie.error).toBe(true)
    expect(cornie.streaming).toBe(false)
    expect(cornie.content).toContain('走神')
  })

  it('发送中禁止重复提交（sending 守卫共用）', async () => {
    let resolveStream
    api.streamConversation.mockImplementation(
      () => new Promise((r) => { resolveStream = r })
    )

    const chat = useChat()
    const p1 = chat.streamSend('a')
    const p2 = await chat.streamSend('b') // sending 中，应直接返回 null
    expect(p2).toBeNull()
    expect(api.streamConversation).toHaveBeenCalledTimes(1)

    resolveStream({ userMessage: { id: 'u1' }, cornieMessage: { id: 'c1', content: 'x' } })
    await p1
  })

  it('send 非流式路径保持原行为', async () => {
    api.sendMessage.mockResolvedValue({
      userMessage: { id: 'u1' },
      cornieMessage: { id: 'c1', content: '非流式回复' }
    })
    const chat = useChat()
    const data = await chat.send('hi')

    expect(data).not.toBeNull()
    expect(api.sendMessage).toHaveBeenCalledWith('hi', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(chat.messages.value.some((m) => m.id === 'c1' && m.content === '非流式回复')).toBe(true)
    expect(chat.messages.value.some((m) => m.streaming)).toBe(false)
  })
})
