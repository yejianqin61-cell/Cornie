import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useChat, type ChatMessageItem } from '../../src/renderer/hooks/useChat'

// 聊天 reconcile 核心回归（移植自旧 chat-dedup / stream-send / polling-timers 测试）。
// R-02 三条去重规则 + replaceMessageById upsert + 轮询防重入/隐藏跳过。

function msg(id: string, role: 'user' | 'cornie', content: string, extra: Partial<ChatMessageItem> = {}): ChatMessageItem {
  return { kind: 'message', id, role, content, ...extra }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('useChat reconcile', () => {
  it('loadConversation：cornie 按 role+content 去重（R-02 放宽规则）', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/conversations/')) {
        return jsonResponse({
          messages: [
            { id: 'm1', role: 'user', content: '你好' },
            { id: 'm2', role: 'cornie', content: '早呀' },
          ],
        })
      }
      return jsonResponse({ confirmations: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.loadConversation('2026-02-14')
    })
    expect(result.current.messages).toHaveLength(2)

    // 同内容 cornie 消息（不同 id）再来一遍 → 不重复上屏
    await act(async () => {
      await result.current.loadConversation('2026-02-14')
    })
    expect(result.current.messages).toHaveLength(2)
  })

  it('replaceMessageById：同 id 移除再追加（upsert 语义，杜绝同 id 并存）', async () => {
    const { result } = renderHook(() => useChat())

    act(() => {
      result.current.pushItem(msg('a', 'user', '第一条'))
      result.current.pushItem(msg('b', 'cornie', '第二条'))
      result.current.pushItem(msg('c', 'cornie', '第三条'))
    })
    expect(result.current.messages.map((m) => m.id)).toEqual(['a', 'b', 'c'])

    act(() => {
      result.current.replaceMessageById('a', { content: '第一条（已回填）' })
    })
    expect(result.current.messages.map((m) => m.id)).toEqual(['b', 'c', 'a'])
    expect(
      result.current.messages.filter((m) => m.kind === 'message' && m.id === 'a')
    ).toHaveLength(1)
  })

  it('send：用户消息 id 回填 + cornie 回复上屏 + 失败回退文案', async () => {
    let fail = false
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/conversations') ) {
        if (fail) throw new TypeError('network down')
        return jsonResponse({
          userMessage: { id: 'server-u1' },
          cornieMessage: { id: 'server-c1', content: '这是回复' },
        })
      }
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useChat())
    await act(async () => {
      await result.current.send('帮我记一笔')
    })

    let items = result.current.messages
    expect(items.find((m) => m.kind === 'message' && m.role === 'cornie' && m.content === '这是回复')).toBeTruthy()
    const userItem = items.find((m) => m.kind === 'message' && m.content === '帮我记一笔') as ChatMessageItem
    expect(userItem.id).toBe('server-u1')
    expect(userItem.pendingSync).toBe(false)

    // 失败路径：temp 消息标记 error，cornie 错误文案上屏
    fail = true
    await act(async () => {
      await result.current.send('再来一条')
    })
    items = result.current.messages
    expect(items.some((m) => m.kind === 'message' && m.content === '唔...我好像走神了，能再说一遍吗？')).toBe(true)
  })

  it('startConversationSync：document.hidden 跳过轮询，防重入不叠加', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async () => jsonResponse({ messages: [], confirmations: [] }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useChat())

    // 隐藏窗口 → 立即同步与定时器轮询都跳过
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    act(() => {
      result.current.startConversationSync('2026-02-14', { intervalMs: 1000 })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500)
    })
    expect(fetchMock).not.toHaveBeenCalled()

    // 恢复可见 → 补一次同步
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(fetchMock).toHaveBeenCalled()

    act(() => {
      result.current.stopConversationSync()
    })
    const callsAfterStop = fetchMock.mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetchMock.mock.calls.length).toBe(callsAfterStop)
    vi.useRealTimers()
  })

  it('流式 onDelta 经批量 flush 收敛进 streaming 占位消息', async () => {
    const sseBody = [
      'data: ' + JSON.stringify({ kind: 'delta', text: '你' }),
      'data: ' + JSON.stringify({ kind: 'delta', text: '好' }),
      'data: ' + JSON.stringify({ kind: 'done', result: { userMessage: { id: 'u1' }, cornieMessage: { id: 'c1', content: '你好呀' } } }),
    ].join('\n')

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/conversations/stream')) {
        return new Response(sseBody, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
      }
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useChat())
    await act(async () => {
      await result.current.streamSend('打个招呼')
    })

    const items = result.current.messages
    // 流式占位被 done 的最终回复替换（streaming=false，内容为服务端内容）
    const finalMsg = items.find((m) => m.kind === 'message' && m.id === 'c1') as ChatMessageItem | undefined
    expect(finalMsg?.content).toBe('你好呀')
    expect(finalMsg?.streaming).toBeFalsy()
  })

  it('确认流：pending → approve → 状态收敛 + 工具结果上屏', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/confirmations/req-1/decision')) {
        return jsonResponse({
          confirmation: { status: 'approved' },
          toolExecution: { used: true, results: [{ ok: true, tool_name: 'ledger.create_expense_entry' }] },
          cornieMessage: { id: 'cf-1', content: '已经记好啦' },
        })
      }
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useChat())
    act(() => {
      result.current.pushItem({
        kind: 'confirm',
        request: { title: '记一笔支出？' },
        pendingConfirmationId: 'req-1',
        status: 'pending',
        errorMessage: '',
      })
    })

    const confirmItem = result.current.messages.find((m) => m.kind === 'confirm')!
    await act(async () => {
      await result.current.handleConfirmAction('confirm', confirmItem as never)
    })

    const after = result.current.messages.find((m) => m.kind === 'confirm') as { status?: string }
    expect(after.status).toBe('approved')
    expect(result.current.messages.some((m) => m.kind === 'tool_result')).toBe(true)
  })

  it('等待中的轮询同步收敛临时用户消息（pendingSync 去重规则）', async () => {
    // 先本地 push 一条 pendingSync 用户消息（等价发送中断网未回填）
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        messages: [{ id: 'm1', role: 'user', content: '本地消息' }],
        confirmations: [],
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useChat())
    act(() => {
      result.current.pushItem(msg('temp-1', 'user', '本地消息', { pendingSync: true }))
    })
    expect(result.current.messages).toHaveLength(1)

    await act(async () => {
      await result.current.syncConversation('2026-02-14')
    })
    // 服务端同 content 用户消息命中 pendingSync 规则 → 不新增
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].id).toBe('temp-1')
  })
})

describe('useChat 与真实后端契约', () => {
  it('waitFor 轮询后消息收敛（集成烟测）', async () => {
    let pollCount = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/conversations/')) {
        pollCount += 1
        return jsonResponse(
          pollCount >= 2
            ? { messages: [{ id: 'late-1', role: 'cornie', content: '迟到的回复' }] }
            : { messages: [] }
        )
      }
      return jsonResponse({ confirmations: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useChat())
    act(() => {
      result.current.startConversationSync('2026-02-14', { intervalMs: 50 })
    })
    await waitFor(
      () => {
        expect(result.current.messages.some((m) => m.kind === 'message' && m.id === 'late-1')).toBe(true)
      },
      { timeout: 2000 }
    )
    act(() => {
      result.current.stopConversationSync()
    })
  })
})
