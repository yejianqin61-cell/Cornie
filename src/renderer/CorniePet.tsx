import { useEffect, useMemo, useRef, useState } from 'react'
import { scrollElementToBottom, useChat } from './hooks/useChat'
import { today } from './utils/date'
import './CorniePet.css'

// 桌宠小窗（React 版 CorniePet.vue）：透明无边框窗口。
// 保留纯手写 DOM + --pet-* token（见 cornieMain.tsx 中的豁免说明）：
// Mantine portal 类组件（Modal/Popover）在透明窗口内行为不可控，交互/动画高度定制。
// 行为契约：拖拽 IPC 协议、mood 状态机、置顶/停留、通知条（确认 > 追问 > 错误）、
// 复用 useChat 的消息/发送/轮询同步，全部与 Vue 版一致。

export default function CorniePet() {
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [focused, setFocused] = useState(false)
  const [alwaysOnTop, setAlwaysOnTop] = useState(false)
  const [message, setMessage] = useState('')
  const [dragReady, setDragReady] = useState(false)

  const chatListRef = useRef<HTMLDivElement | null>(null)
  const windowDragRef = useRef<{ pointerId: number } | null>(null)

  const { messages, sending, send, loadConversation, restorePendingConfirmations, startConversationSync } = useChat()

  const displayMessages = useMemo(() => messages.filter((item) => item.kind === 'message'), [messages])
  const pendingCount = useMemo(
    () => messages.filter((item) => item.kind === 'confirm' && item.status === 'pending').length,
    [messages]
  )
  const latestAskBack = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].kind === 'ask_back') return messages[i]
    }
    return null
  }, [messages])
  const latestError = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].kind === 'error') return messages[i]
    }
    return null
  }, [messages])

  const latestNotice = useMemo(() => {
    if (pendingCount > 0) {
      return {
        type: 'confirm',
        text: `有 ${pendingCount} 件事，小铃湾想先和主人确认一下。`,
        actionLabel: '去主窗口',
      }
    }
    if (latestAskBack?.kind === 'ask_back' && latestAskBack.question) {
      return { type: 'ask_back', text: latestAskBack.question, actionLabel: '' }
    }
    if (latestError?.kind === 'error' && latestError.content) {
      return { type: 'error', text: latestError.content, actionLabel: '' }
    }
    return null
  }, [pendingCount, latestAskBack, latestError])

  const mood = sending ? '( •_• )' : focused ? '( •ᴗ• )' : hover || pinned ? '(•‿•)' : '( ᴗ ᴗ )'
  const petStateClass = sending ? 'is-thinking' : focused ? 'is-focus' : hover || pinned ? 'is-hover' : 'is-idle'
  const isExpanded = hover || pinned || focused

  const onEnter = () => setHover(true)
  const onLeave = () => {
    setHover(false)
    if (!pinned && !focused) {
      scrollElementToBottom(chatListRef.current)
    }
  }
  const onFocusIn = () => setFocused(true)
  const onFocusOut = (event: React.FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && event.currentTarget.contains(nextTarget)) return
    setFocused(false)
  }
  const togglePinned = () => setPinned((prev) => !prev)

  const toggleAlwaysOnTop = async () => {
    try {
      const nextValue = await window.cornieDesktop?.setAlwaysOnTop?.(!alwaysOnTop)
      setAlwaysOnTop(Boolean(nextValue))
    } catch {
      setAlwaysOnTop((prev) => !prev)
    }
  }

  const openMainWindow = () => {
    try {
      window.cornieDesktop?.showMainWindow?.()
    } catch {
      // ignore
    }
  }

  // ── 窗口拖拽（IPC 协议：drag-start → drag-move → drag-end） ──
  const canWindowDrag = (target: EventTarget | null): boolean => {
    if (typeof window === 'undefined' || !window.cornieDesktop) return false
    const interactive = (target as HTMLElement | null)?.closest?.('button, input')
    return !interactive
  }

  const onDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canWindowDrag(e.target)) return
    if (e.button !== undefined && e.button !== 0) return
    windowDragRef.current = { pointerId: e.pointerId }
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {
      // ignore
    }
    window.cornieDesktop?.dragStart?.({ screenX: e.screenX, screenY: e.screenY })
  }

  const onDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!windowDragRef.current || !window.cornieDesktop) return
    window.cornieDesktop?.dragMove?.({ screenX: e.screenX, screenY: e.screenY })
  }

  const onDragPointerUp = () => {
    if (!windowDragRef.current) return
    windowDragRef.current = null
    try {
      window.cornieDesktop?.dragEnd?.()
    } catch {
      // ignore
    }
  }

  // 新消息/发送状态变化 → 滚到底部（渲染后一帧，等价 Vue nextTick 语义）
  useEffect(() => {
    scrollElementToBottom(chatListRef.current)
  }, [displayMessages.length, sending])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      setDragReady(typeof window !== 'undefined' && Boolean(window.cornieDesktop))
      try {
        const value = await window.cornieDesktop?.getAlwaysOnTop?.()
        if (!cancelled) setAlwaysOnTop(Boolean(value))
      } catch {
        if (!cancelled) setAlwaysOnTop(false)
      }
      const date = today()
      await loadConversation(date)
      if (cancelled) return
      await restorePendingConfirmations(date)
      if (cancelled) return
      scrollElementToBottom(chatListRef.current)
      startConversationSync(date, {
        onAfterSync: () => {
          scrollElementToBottom(chatListRef.current)
        },
      })
    }
    void init()
    return () => {
      cancelled = true
    }
    // 卸载时的轮询清理由 useChat 内部兜底；本组件无需重复 stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendCurrent = async () => {
    const text = message.trim()
    if (!text || sending) return
    setMessage('')
    setFocused(true)
    setPinned(true)
    await send(text)
    scrollElementToBottom(chatListRef.current)
  }

  return (
    <div className="petRoot">
      <div
        className={`petShell ${petStateClass}${isExpanded ? ' is-expanded' : ''}${dragReady ? ' is-draggable' : ''}`}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onFocusIn}
        onBlur={onFocusOut}
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onPointerCancel={onDragPointerUp}
      >
        {isExpanded ? (
          <section className="petPanel">
            <div className="petPanelAura" />

            <div ref={chatListRef} className="petMessages">
              {displayMessages.length === 0 && !sending ? (
                <div className="petEmpty">
                  <div className="petEmptyTitle">小铃湾在这里</div>
                  <div className="petEmptyHint">把今天想说的话，轻轻放过来吧。</div>
                </div>
              ) : (
                <>
                  {displayMessages.map((item) => (
                    <div key={item.id} className={`petMessageRow ${item.role === 'user' ? 'is-user' : 'is-cornie'}`}>
                      <div className={`petMessageBubble ${item.role === 'user' ? 'is-user' : 'is-cornie'}`}>
                        <div className="petMessageRole">{item.role === 'user' ? '主人' : '小铃湾'}</div>
                        <div className="petMessageText">{item.content}</div>
                      </div>
                    </div>
                  ))}
                  {sending ? (
                    <div className="petMessageRow is-cornie">
                      <div className="petMessageBubble is-cornie">
                        <div className="petMessageRole">小铃湾</div>
                        <div className="petMessageText is-thinking">正在想你说的话……</div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {latestNotice ? (
              <div className={`petNotice is-${latestNotice.type}`}>
                <div className="petNoticeText">{latestNotice.text}</div>
                {latestNotice.actionLabel ? (
                  <button type="button" className="petNoticeAction" onClick={openMainWindow}>
                    {latestNotice.actionLabel}
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="petInputBar">
              <input
                className="petInput"
                type="text"
                placeholder="和小铃湾说句话……"
                value={message}
                onChange={(e) => setMessage(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void sendCurrent()
                  }
                }}
              />
              <button
                type="button"
                className={`petTopButton${alwaysOnTop ? ' is-on' : ''}`}
                title={alwaysOnTop ? '取消置于上方' : '置于所有页面上方'}
                onClick={() => void toggleAlwaysOnTop()}
              >
                {alwaysOnTop ? '顶' : '浮'}
              </button>
              <button
                type="button"
                className={`petPinButton${pinned ? ' is-on' : ''}`}
                title={pinned ? '取消停留' : '让她多陪一会儿'}
                onClick={togglePinned}
              >
                {pinned ? '停' : '留'}
              </button>
              <button
                type="button"
                className="petSendButton"
                disabled={!message.trim() || sending}
                onClick={() => void sendCurrent()}
              >
                说
              </button>
            </div>
          </section>
        ) : null}

        <button
          type="button"
          className={`petFace${isExpanded ? ' is-active' : ''}`}
          onClick={() => setPinned((prev) => !prev)}
        >
          <span className="petFaceGlow" />
          <span className="petFaceText">{mood}</span>
        </button>
      </div>
    </div>
  )
}
