import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, EmptyState, Group, Stack, Text, Textarea } from '@mantine/core'
import { IconMessageCircle } from '@tabler/icons-react'

import { useChat, type ChatConfirmItem, type ChatItem } from '../hooks/useChat'
import { today } from '../utils/date'
import ConfirmCard from '../components/chat/ConfirmCard'
import AskBackBubble from '../components/chat/AskBackBubble'
import ToolResultPanel from '../components/chat/ToolResultPanel'

// 主聊天页（React 版 ChatHome.vue）：FE-03 流式发送 + R-02 消息 reconcile + FE-04 轮询同步。
// 交互契约：底部吸附（36px 阈值）、离底未读提示、Enter 发送/Shift+Enter 换行、
// 输入框自增高（maxHeight 120px）、待确认提示条。导航由 useNavigate 完成（go-history）。

const AUTO_STICK_THRESHOLD = 36

function getDistanceFromBottom(el: HTMLElement): number {
  return el.scrollHeight - el.scrollTop - el.clientHeight
}

function isNearBottom(el: HTMLElement): boolean {
  return getDistanceFromBottom(el) <= AUTO_STICK_THRESHOLD
}

export default function ChatHome() {
  const navigate = useNavigate()
  const {
    messages,
    sending,
    streamSend,
    handleConfirmAction,
    restorePendingConfirmations,
    loadConversation,
    startConversationSync,
  } = useChat()

  const [message, setMessage] = useState('')
  const chatListRef = useRef<HTMLDivElement | null>(null)
  const pinnedRef = useRef(true)
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false)
  const hasInitializedScrollRef = useRef(false)
  const prevMessageCountRef = useRef(0)

  const todayDate = useMemo(() => {
    const d = new Date()
    const weekDay = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${weekDay}`
  }, [])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 6) return '夜深了，还没睡吗？'
    if (h < 12) return '早上好，今天是个新开始。'
    if (h < 14) return '中午好，记得吃午饭呀。'
    if (h < 18) return '下午好，今天过得怎么样？'
    return '晚上好，今天辛苦啦。'
  }, [])

  const pendingCount = useMemo(
    () => messages.filter((m) => m.kind === 'confirm' && m.status === 'pending').length,
    [messages]
  )

  const scrollToBottom = useCallback((force = false) => {
    const el = chatListRef.current
    if (!el) return
    if (!force && !pinnedRef.current) {
      setHasUnreadBelow(true)
      return
    }
    el.scrollTop = el.scrollHeight
    pinnedRef.current = true
    setHasUnreadBelow(false)
  }, [])

  const handleChatScroll = useCallback(() => {
    const el = chatListRef.current
    if (!el) return
    const pinned = isNearBottom(el)
    pinnedRef.current = pinned
    if (pinned) {
      setHasUnreadBelow(false)
    }
  }, [])

  const onSend = useCallback(async () => {
    const text = message.trim()
    if (!text || sending) return
    setMessage('')
    // FE-03：主聊天入口默认流式；非流式 send 保留为回退（send，当前未被 UI 使用）。
    await streamSend(text)
    scrollToBottom()
  }, [message, sending, streamSend, scrollToBottom])

  const onConfirm = useCallback(
    async (action: 'confirm' | 'reject', item: ChatConfirmItem) => {
      await handleConfirmAction(action, item)
      scrollToBottom()
    },
    [handleConfirmAction, scrollToBottom]
  )

  // 挂载：加载今日会话 + 待确认恢复 + 启动轮询（StrictMode 安全：清理由 useChat/unmount 完成）
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const date = today()
      await loadConversation(date)
      if (cancelled) return
      await restorePendingConfirmations(date)
      if (cancelled) return
      scrollToBottom(true)
      hasInitializedScrollRef.current = true
      startConversationSync(date, {
        onAfterSync: () => {
          scrollToBottom()
        },
      })
    }
    void init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 新消息上屏 → 按吸附状态决定滚动或未读提示
  useEffect(() => {
    const current = messages.length
    const previous = prevMessageCountRef.current
    prevMessageCountRef.current = current
    if (!hasInitializedScrollRef.current || current <= previous) return
    scrollToBottom()
  }, [messages.length, scrollToBottom])

  const renderChatItem = (m: ChatItem) => {
    if (m.kind === 'message') {
      return (
        <Box
          p="8px 14px"
          maw="75%"
          style={{
            borderRadius: 'var(--radius-lg)',
            borderBottomRightRadius: m.role === 'user' ? 6 : undefined,
            borderBottomLeftRadius: m.role === 'cornie' ? 6 : undefined,
            background: m.role === 'user' ? 'var(--color-accent)' : 'var(--color-surface-2)',
            color: m.role === 'user' ? 'var(--color-surface)' : 'var(--color-text)',
          }}
        >
          <Text fz="var(--text-xs)" opacity={0.6} mb={2}>
            {m.role === 'user' ? '你' : '铃湾'}
          </Text>
          <Text fz="var(--text-md)" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {m.content}
          </Text>
        </Box>
      )
    }
    if (m.kind === 'tool_result') {
      return <ToolResultPanel results={m.results} />
    }
    if (m.kind === 'confirm') {
      return (
        <ConfirmCard
          request={m.request}
          status={m.status || 'pending'}
          errorMessage={m.errorMessage || ''}
          onConfirm={() => void onConfirm('confirm', m)}
          onReject={() => void onConfirm('reject', m)}
        />
      )
    }
    if (m.kind === 'ask_back') {
      return <AskBackBubble question={m.question} reason={m.reason} />
    }
    // kind === 'error'
    return (
      <Box
        p="8px 14px"
        maw="100%"
        style={{
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-danger-soft)',
          color: 'var(--color-danger)',
        }}
      >
        <Text fz="var(--text-xs)" opacity={0.6} mb={2}>
          系统提示
        </Text>
        <Text fz="var(--text-md)" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {m.content}
        </Text>
      </Box>
    )
  }

  return (
    <Stack
      gap={0}
      h="100%"
      style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
    >
      {/* 顶部陪伴区 */}
      <Group
        align="baseline"
        gap={12}
        px={20}
        py={8}
        wrap="nowrap"
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-tint-chat)',
          flex: '0 0 auto',
        }}
      >
        <Text fz="var(--text-md)" fw={700} style={{ whiteSpace: 'nowrap' }}>
          {greeting}
        </Text>
        <Text fz="var(--text-sm)" c="dimmed">
          {todayDate}
        </Text>
        <Button variant="subtle" size="compact-sm" ml={6} onClick={() => navigate('/chat/history')}>
          翻看以前聊天
        </Button>
        <Text fz="var(--text-sm)" c="dimmed" ml="auto">
          想和我聊点什么？
        </Text>
      </Group>

      {/* 主对话区 */}
      <Box
        ref={chatListRef}
        onScroll={handleChatScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 20px',
          scrollBehavior: 'smooth',
          position: 'relative',
          minHeight: 0,
        }}
      >
        {messages.length === 0 && !sending ? (
          <EmptyState
            h="100%"
            icon={<IconMessageCircle size={32} stroke={1.5} />}
            title="给铃湾发一条消息吧"
            style={{ justifyContent: 'center' }}
          />
        ) : (
          <Stack gap={10}>
            {messages.map((m) => (
              <Box
                key={m.id}
                w="100%"
                style={{
                  display: 'flex',
                  justifyContent: m.kind === 'message' && m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {renderChatItem(m)}
              </Box>
            ))}
            {sending ? (
              <Box
                p="8px 14px"
                maw="75%"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  borderBottomLeftRadius: 6,
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text)',
                }}
              >
                <Text fz="var(--text-xs)" opacity={0.6} mb={2}>
                  铃湾
                </Text>
                <Text fz="var(--text-md)" opacity={0.6} style={{ fontStyle: 'italic' }}>
                  正在思考...
                </Text>
              </Box>
            ) : null}
          </Stack>
        )}

        {hasUnreadBelow ? (
          <Button
            variant="light"
            size="compact-sm"
            w="fit-content"
            ml="auto"
            mt={12}
            style={{ position: 'sticky', left: '100%', bottom: 10, display: 'inline-flex' }}
            onClick={() => scrollToBottom(true)}
          >
            回到底部
          </Button>
        ) : null}
      </Box>

      {/* 输入区 */}
      <Group
        align="flex-end"
        gap={8}
        px={16}
        py={10}
        wrap="nowrap"
        style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', flex: '0 0 auto' }}
      >
        <Textarea
          flex={1}
          autosize
          minRows={1}
          maxRows={4}
          placeholder="和铃湾说句话..."
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void onSend()
            }
          }}
          styles={{
            input: {
              minHeight: 36,
              resize: 'none',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
            },
          }}
        />
        <Button
          disabled={!message.trim() || sending}
          onClick={() => void onSend()}
          style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}
        >
          发送
        </Button>
      </Group>

      {/* 待确认提示 */}
      {pendingCount > 0 ? (
        <Text
          ta="center"
          fz="var(--text-sm)"
          c="dimmed"
          px={20}
          py={6}
          style={{ background: 'var(--color-tint-chat)', borderTop: '1px solid var(--color-border)' }}
        >
          有 {pendingCount} 条待确认事项，请在上面处理。
        </Text>
      ) : null}
    </Stack>
  )
}
