// 聊天状态核心（Cornie-021 FE-03 / R-02 / 453 / 454；从 Vue 版 useChat.js 迁移为 React hook）。
//
// 行为契约（必须与 Vue 版逐条一致）：
// - 消息 reconcile：hasEquivalentMessage 三条去重规则（同 id / cornie 按 role+content /
//   用户消息要求 pendingSync）+ replaceMessageById 的「同 id 移除再追加」upsert 语义；
// - 轮询：默认 3s，防重入（syncing 标志），document.hidden 跳过，恢复可见立即补同步；
// - 发送骨架：stream=false 走 sendMessage，stream=true 走 streamConversation + 逐字增量；
//   占位消息、发送中禁发、用户消息 id 回填、层间话语/工具结果/确认卡、错误回退全部共用；
// - data-changed 信号：工具结果按 tool_name 前缀聚合 5 域后 emitDataChanged。
//
// React 形态差异（重写决策，非行为变化）：
// - 读写统一走 messagesRef 镜像（异步 await 点之间的顺序语义与 Vue 版一致），每次变更
//   同步 setMessages 触发渲染；
// - 流式 onDelta：Vue 版是就地 content += delta；React 改为 ref 缓冲 + 50ms 批量 flush，
//   避免「每个 delta 一次 setState」的渲染风暴；
// - 轮询定时器/监听器全部放 ref，stop 时严格清理（StrictMode 双挂载安全）。

import { useCallback, useEffect, useRef, useState } from 'react'
import { getConversation, listConfirmations, sendMessage, streamConversation, submitConfirmationDecision } from '../api'
import { collectChangedDomains, emitDataChanged } from '../syncSignals'
import { today } from '../utils/date'

export type ChatRole = 'user' | 'cornie'

export interface ChatMessageItem {
  kind: 'message'
  id: string
  role: ChatRole
  content: string
  streaming?: boolean
  pendingSync?: boolean
  error?: boolean
  interim?: boolean
}

export interface ChatConfirmItem {
  kind: 'confirm'
  id: string
  request: Record<string, unknown>
  pendingConfirmationId: string
  status: string
  errorMessage: string
}

export interface ChatAskBackItem {
  kind: 'ask_back'
  id: string
  question: string
  reason: string
}

export interface ChatToolResultItem {
  kind: 'tool_result'
  id: string
  results: Array<Record<string, unknown>>
}

export interface ChatErrorItem {
  kind: 'error'
  id: string
  content: string
}

export type ChatItem = ChatMessageItem | ChatConfirmItem | ChatAskBackItem | ChatToolResultItem | ChatErrorItem

export interface ChatResponseData {
  userMessage?: { id?: string; content?: string; role?: string } | null
  cornieMessage?: { id?: string; content?: string; role?: string } | null
  interimReplies?: unknown
  toolExecution?: { used?: boolean; results?: Array<Record<string, unknown>> } | null
  policyDecision?: {
    decision?: string
    confirmRequest?: Record<string, unknown>
    question?: string
    reason?: string
  } | null
  pendingConfirmation?: { id?: string; status?: string } | null
  followupConfirmation?: { id?: string; status?: string; confirmRequest?: Record<string, unknown> } | null
  [key: string]: unknown
}

function makeItemId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** pushItem 入参：任一 ChatItem 变体且 id 可省略（分布式映射保住各变体字段）。 */
type WithOptionalId<T> = T extends { id: string } ? Omit<T, 'id'> & { id?: string } : never
export type ChatItemDraft = WithOptionalId<ChatItem>

export interface ConversationSyncOptions {
  intervalMs?: number
  onAfterSync?: () => void | Promise<void>
}

export function useChat() {
  const [messages, setMessages] = useState<ChatItem[]>([])
  const [sending, setSending] = useState(false)

  const messagesRef = useRef<ChatItem[]>([])
  const sendingRef = useRef(false)
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const visibilityHandlerRef = useRef<(() => void) | null>(null)
  // 流式缓冲：liveId → 待追加文本；flushTimer 用于批量合并渲染
  const streamBufferRef = useRef('')
  const streamLiveIdRef = useRef<string | null>(null)
  const streamFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyMessages = useCallback((next: ChatItem[]) => {
    messagesRef.current = next
    setMessages(next)
  }, [])

  const pushItem = useCallback(
    (item: ChatItemDraft): ChatItem => {
      const withId = { ...item, id: item.id || makeItemId(String(item.kind)) } as ChatItem
      applyMessages([...messagesRef.current, withId])
      return withId
    },
    [applyMessages]
  )

  const replaceMessageById = useCallback(
    (id: string, patch: Partial<ChatItem>): boolean => {
      const existing = messagesRef.current.find((item) => item.id === id)
      if (!existing) return false
      const merged = { ...existing, ...patch } as ChatItem
      // R-02：upsert 语义——先移除所有同 id 旧项再追加合并项，杜绝同 id 并存。
      applyMessages([...messagesRef.current.filter((item) => item.id !== id), merged])
      return true
    },
    [applyMessages]
  )

  const hasEquivalentMessage = useCallback((msg: { id?: string; role?: string; content?: string }): boolean => {
    return messagesRef.current.some((item) => {
      if (item.kind !== 'message') return false
      if (item.id === msg.id) return true
      // R-02：cornie 消息按 role+content 去重（放宽，不再要求 pendingSync）。
      if (item.role === 'cornie' && msg.role === 'cornie') {
        return item.content === msg.content
      }
      return (
        item.role === (msg.role === 'user' ? 'user' : 'cornie') &&
        item.content === msg.content &&
        item.pendingSync === true
      )
    })
  }, [])

  const setConfirmMessageState = useCallback(
    (id: string, patch: Partial<ChatConfirmItem>): void => {
      const next = messagesRef.current.map((item) =>
        item.id === id && item.kind === 'confirm' ? { ...item, ...patch } : item
      )
      applyMessages(next)
    },
    [applyMessages]
  )

  const notifyDataChanged = useCallback((results: unknown, source: string): void => {
    const changed = collectChangedDomains(Array.isArray(results) ? results : [])
    if (!Object.values(changed).some(Boolean)) return
    emitDataChanged({ source, ...changed })
  }, [])

  // ── 流式缓冲：批量 flush ──
  const flushStreamBuffer = useCallback(() => {
    if (streamFlushTimerRef.current) {
      clearTimeout(streamFlushTimerRef.current)
      streamFlushTimerRef.current = null
    }
    const buffered = streamBufferRef.current
    if (!buffered) return
    streamBufferRef.current = ''
    const liveId = streamLiveIdRef.current
    if (!liveId) return
    const next = messagesRef.current.map((item) =>
      item.id === liveId && item.kind === 'message' ? { ...item, content: item.content + buffered } : item
    )
    applyMessages(next)
  }, [applyMessages])

  const scheduleStreamFlush = useCallback(() => {
    if (streamFlushTimerRef.current) return
    streamFlushTimerRef.current = setTimeout(() => {
      streamFlushTimerRef.current = null
      flushStreamBuffer()
    }, 50)
  }, [flushStreamBuffer])

  const appendResponse = useCallback(
    (data: ChatResponseData | null, { replaceId = null }: { replaceId?: string | null } = {}) => {
      // 453：钻取轮的联想话语（层间短话）先上屏，最终回复随后接续。
      if (Array.isArray(data?.interimReplies)) {
        for (const line of data.interimReplies) {
          if (typeof line === 'string' && line.trim()) {
            pushItem({ kind: 'message', role: 'cornie', content: line, interim: true })
          }
        }
      }

      // FE-03：流式路径（replaceId）将最终回复替换进 streaming 占位消息，不重复上屏。
      if (replaceId) {
        if (data?.cornieMessage?.content) {
          replaceMessageById(replaceId, {
            id: data.cornieMessage.id || replaceId,
            content: data.cornieMessage.content,
            streaming: false,
            pendingSync: false,
          } as Partial<ChatMessageItem>)
        } else {
          replaceMessageById(replaceId, { streaming: false, error: true } as Partial<ChatMessageItem>)
        }
      } else if (data?.cornieMessage?.content) {
        pushItem({
          kind: 'message',
          role: 'cornie',
          content: data.cornieMessage.content,
          id: data.cornieMessage.id || undefined,
        })
      }

      if (
        data?.toolExecution?.used &&
        Array.isArray(data.toolExecution.results) &&
        data.toolExecution.results.length > 0
      ) {
        pushItem({ kind: 'tool_result', results: data.toolExecution.results })
      }

      const decision = data?.policyDecision?.decision
      if (decision === 'confirm') {
        pushItem({
          kind: 'confirm',
          request: (data?.policyDecision?.confirmRequest || {}) as Record<string, unknown>,
          pendingConfirmationId: data?.pendingConfirmation?.id || '',
          status: data?.pendingConfirmation?.status || 'pending',
          errorMessage: '',
        })
      } else if (decision === 'ask_back') {
        pushItem({
          kind: 'ask_back',
          question: data?.policyDecision?.question || '',
          reason: data?.policyDecision?.reason || '',
        })
      } else if (decision === 'deny') {
        pushItem({
          kind: 'error',
          content: data?.policyDecision?.reason || '这个动作现在不能执行。',
        })
      }

      notifyDataChanged(data?.toolExecution?.results, 'chat')
    },
    [pushItem, replaceMessageById, notifyDataChanged]
  )

  const sendCore = useCallback(
    async (text: string, { stream = false }: { stream?: boolean } = {}): Promise<ChatResponseData | null> => {
      if (!text || sendingRef.current) return null
      sendingRef.current = true
      setSending(true)

      const tempId = `temp-user-${Date.now()}`
      const liveId = stream ? `live-cornie-${Date.now()}` : null

      pushItem({
        kind: 'message',
        role: 'user',
        content: text,
        id: tempId,
        pendingSync: true,
      })

      if (liveId) {
        streamLiveIdRef.current = liveId
        pushItem({ kind: 'message', role: 'cornie', content: '', id: liveId, streaming: true })
      }

      try {
        let data: ChatResponseData | null
        if (stream) {
          const appendDelta = (delta: string) => {
            streamBufferRef.current += delta
            scheduleStreamFlush()
          }
          data = (await streamConversation({ message: text, date: today() }, appendDelta)) as ChatResponseData | null
          flushStreamBuffer()
        } else {
          data = (await sendMessage(text, today())) as ChatResponseData | null
        }

        if (data?.userMessage?.id) {
          replaceMessageById(tempId, {
            id: data.userMessage.id,
            pendingSync: false,
          } as Partial<ChatMessageItem>)
        }

        appendResponse(data, liveId ? { replaceId: liveId } : {})
        return data
      } catch {
        replaceMessageById(tempId, { pendingSync: false, error: true } as Partial<ChatMessageItem>)
        if (liveId) {
          flushStreamBuffer()
          replaceMessageById(liveId, {
            content: '唔...我好像走神了，能再说一遍吗？',
            streaming: false,
            error: true,
          } as Partial<ChatMessageItem>)
        } else {
          pushItem({
            kind: 'message',
            role: 'cornie',
            content: '唔...我好像走神了，能再说一遍吗？',
            id: 'err-' + Date.now(),
            error: true,
          })
        }
        return null
      } finally {
        streamLiveIdRef.current = null
        flushStreamBuffer()
        sendingRef.current = false
        setSending(false)
      }
    },
    [pushItem, replaceMessageById, appendResponse, flushStreamBuffer, scheduleStreamFlush]
  )

  const send = useCallback((text: string) => sendCore(text), [sendCore])

  // 454：流式发送——最终回复逐字渲染；tool_call 信封不流式（由服务端保证）。
  const streamSend = useCallback((text: string) => sendCore(text, { stream: true }), [sendCore])

  const handleConfirmAction = useCallback(
    async (action: 'confirm' | 'reject', item: ChatConfirmItem): Promise<void> => {
      if (!item?.pendingConfirmationId || item.status !== 'pending') return

      setConfirmMessageState(item.id, { status: 'processing', errorMessage: '' })

      try {
        const result = (await submitConfirmationDecision(
          item.pendingConfirmationId,
          action === 'confirm' ? 'approve' : 'reject'
        )) as ChatResponseData | null

        setConfirmMessageState(item.id, {
          status:
            (result?.confirmation as { status?: string } | undefined)?.status ||
            (action === 'confirm' ? 'approved' : 'rejected'),
          errorMessage: '',
        })

        if (
          result?.toolExecution?.used &&
          Array.isArray(result.toolExecution.results) &&
          result.toolExecution.results.length > 0
        ) {
          pushItem({ kind: 'tool_result', results: result.toolExecution.results })
        }

        if (result?.cornieMessage?.content) {
          pushItem({
            kind: 'message',
            role: 'cornie',
            content: result.cornieMessage.content,
            id: result.cornieMessage.id || undefined,
          })
        }

        if (result?.followupConfirmation?.id && result?.followupConfirmation?.confirmRequest) {
          pushItem({
            kind: 'confirm',
            request: result.followupConfirmation.confirmRequest as Record<string, unknown>,
            pendingConfirmationId: result.followupConfirmation.id,
            status: result.followupConfirmation.status || 'pending',
            errorMessage: '',
          })
        }

        notifyDataChanged(result?.toolExecution?.results, 'confirmation')
      } catch (error) {
        setConfirmMessageState(item.id, {
          status: 'failed',
          errorMessage: (error as { message?: string })?.message || '确认处理失败，请稍后再试。',
        })
      }
    },
    [setConfirmMessageState, pushItem, notifyDataChanged]
  )

  const restorePendingConfirmations = useCallback(
    async (date: string): Promise<void> => {
      try {
        const data = (await listConfirmations({ date: date || today(), status: 'pending' })) as {
          confirmations?: Array<{ id?: string; confirmRequest?: Record<string, unknown>; status?: string }>
        } | null
        for (const confirmation of data?.confirmations || []) {
          const exists = messagesRef.current.some(
            (item) => item.kind === 'confirm' && item.pendingConfirmationId === confirmation.id
          )
          if (!exists) {
            pushItem({
              kind: 'confirm',
              request: confirmation.confirmRequest || {},
              pendingConfirmationId: confirmation.id || '',
              status: confirmation.status || 'pending',
              errorMessage: '',
            })
          }
        }
      } catch {
        // ignore restore failure
      }
    },
    [pushItem]
  )

  const loadConversation = useCallback(
    async (date: string): Promise<void> => {
      try {
        const data = (await getConversation(date)) as {
          messages?: Array<{ id?: string; role?: string; content?: string }>
        } | null
        if (Array.isArray(data?.messages)) {
          const pending: ChatMessageItem[] = []
          for (const msg of data.messages) {
            const exists =
              hasEquivalentMessage(msg) || pending.some((item) => item.kind === 'message' && item.id === msg.id)
            if (!exists) {
              pending.push({
                kind: 'message',
                role: msg.role === 'user' ? 'user' : 'cornie',
                content: msg.content || '',
                id: msg.id || makeItemId('message'),
              })
            }
          }
          if (pending.length > 0) {
            applyMessages([...messagesRef.current, ...pending])
          }
        }
      } catch {
        // ignore load failure
      }
    },
    [hasEquivalentMessage, applyMessages]
  )

  const syncConversation = useCallback(
    async (date: string): Promise<void> => {
      await loadConversation(date)
      await restorePendingConfirmations(date)
    },
    [loadConversation, restorePendingConfirmations]
  )

  const stopConversationSync = useCallback((): void => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current)
      syncTimerRef.current = null
    }
    if (typeof document !== 'undefined' && visibilityHandlerRef.current) {
      document.removeEventListener('visibilitychange', visibilityHandlerRef.current)
      visibilityHandlerRef.current = null
    }
  }, [])

  const startConversationSync = useCallback(
    (date: string, options: ConversationSyncOptions = {}): void => {
      const syncDate = date || today()
      const intervalMs = Math.max(1000, Number(options.intervalMs) || 3000)
      const onAfterSync = typeof options.onAfterSync === 'function' ? options.onAfterSync : null

      stopConversationSync()

      // FE-04：防重入——上一次同步未完成时跳过本轮，避免慢响应下请求叠加。
      let syncing = false
      const runSync = async () => {
        if (syncing) return
        syncing = true
        try {
          if (typeof document !== 'undefined' && document.hidden) return
          await syncConversation(syncDate)
          await onAfterSync?.()
        } finally {
          syncing = false
        }
      }

      // FE-04：窗口隐藏时定时器仍走（runSync 内部跳过），恢复可见立即补一次同步。
      const onVisibilityChange = () => {
        if (typeof document !== 'undefined' && !document.hidden) {
          void runSync()
        }
      }
      visibilityHandlerRef.current = onVisibilityChange
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onVisibilityChange)
      }

      syncTimerRef.current = setInterval(() => {
        void runSync()
      }, intervalMs)

      void runSync()
    },
    [stopConversationSync, syncConversation]
  )

  // 组件卸载：停轮询 + 冲刷流式缓冲（StrictMode 双挂载安全：卸载路径严格清理）
  useEffect(
    () => () => {
      stopConversationSync()
      if (streamFlushTimerRef.current) {
        clearTimeout(streamFlushTimerRef.current)
        streamFlushTimerRef.current = null
      }
    },
    [stopConversationSync]
  )

  return {
    messages,
    sending,
    send,
    streamSend,
    pushItem,
    replaceMessageById,
    appendResponse,
    setConfirmMessageState,
    handleConfirmAction,
    restorePendingConfirmations,
    loadConversation,
    syncConversation,
    startConversationSync,
    stopConversationSync,
  }
}

/** 把消息列表容器滚动到底部（等价旧 scrollChatToBottom：等待一帧后滚动）。 */
export function scrollElementToBottom(el: HTMLElement | null): void {
  if (!el) return
  requestAnimationFrame(() => {
    el.scrollTop = el.scrollHeight
  })
}
