import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Box, Button, EmptyState, Group, Loader, Stack, Text, Alert, Skeleton } from '@mantine/core'
import { IconMessageCircle } from '@tabler/icons-react'

import { getChatlog } from '../api'

// 单日聊天视图（React 版 ChatDayView.vue）：
// 路由参数 date（/chat/day/:date）+ 可选 ?focus=<messageId> 定位并高亮消息。
// back → /chat/history（原 navHandlers.back 契约）。

interface DayMessage {
  id?: string | number
  role?: string
  content?: string
  [key: string]: unknown
}

function formatDateLabel(date: string): string {
  if (!date) return ''
  const [y, m, d] = String(date).split('-')
  if (!y || !m || !d) return date
  return `${y}年${Number(m)}月${Number(d)}日`
}

export default function ChatDayViewPage() {
  const navigate = useNavigate()
  const { date = '' } = useParams()
  const [searchParams] = useSearchParams()
  const focusMessageId = searchParams.get('focus') || ''

  const [messages, setMessages] = useState<DayMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [highlightedMessageId, setHighlightedMessageId] = useState('')

  const messageRefs = useRef(new Map<string, HTMLElement>())

  const setMessageRef = useCallback((id: string, el: HTMLElement | null) => {
    if (!id) return
    if (el) {
      messageRefs.current.set(id, el)
      return
    }
    messageRefs.current.delete(id)
  }, [])

  const focusMessageIfNeeded = useCallback(async (list: DayMessage[], focusId: string) => {
    if (!focusId) {
      setHighlightedMessageId('')
      return
    }
    const target = list.find((item) => String(item?.id || '') === String(focusId))
    if (!target) {
      setHighlightedMessageId('')
      return
    }
    // 等待一帧让 DOM 就位（等价 Vue nextTick）
    requestAnimationFrame(() => {
      const el = messageRefs.current.get(focusId)
      el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      setHighlightedMessageId(focusId)
    })
  }, [])

  const loadMessages = useCallback(
    async (targetDate: string, focusId: string) => {
      if (!targetDate) {
        setMessages([])
        setHighlightedMessageId('')
        return
      }
      setLoading(true)
      setErrorMsg('')
      try {
        const data = await getChatlog(targetDate)
        const list = (data.messages || []) as DayMessage[]
        setMessages(list)
        await focusMessageIfNeeded(list, focusId)
      } catch (error) {
        setErrorMsg((error as { message?: string })?.message || '加载失败，请稍后再试')
      } finally {
        setLoading(false)
      }
    },
    [focusMessageIfNeeded]
  )

  useEffect(() => {
    void loadMessages(date, focusMessageId)
    // focus 由加载路径一并处理；单独变化时下一个 effect 会补一次定位
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, loadMessages])

  useEffect(() => {
    if (!focusMessageId) {
      setHighlightedMessageId('')
      return
    }
    void focusMessageIfNeeded(messages, focusMessageId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMessageId])

  return (
    <Stack
      gap={0}
      h="100%"
      style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
    >
      <Group gap={14} px={20} py={14} wrap="nowrap" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <Button variant="subtle" onClick={() => navigate('/chat/history')}>
          ← 返回聊天记录
        </Button>
        <Text fz="var(--text-xl)" fw={800}>
          {formatDateLabel(date)}
        </Text>
        {!loading ? (
          <Text fz="var(--text-sm)" c="dimmed" ml="auto">
            {messages.length} 条消息
          </Text>
        ) : null}
      </Group>

      {errorMsg ? (
        <Alert color="danger" variant="light" m={20}>
          {errorMsg}
        </Alert>
      ) : null}

      {loading ? (
        <Stack gap={12} p={20}>
          <Skeleton height={52} radius="lg" />
          <Skeleton height={52} radius="lg" width="70%" />
          <Skeleton height={52} radius="lg" width="85%" />
        </Stack>
      ) : messages.length === 0 ? (
        <EmptyState icon={<IconMessageCircle size={32} stroke={1.5} />} title="这一天还没有聊天记录" mih={240} />
      ) : (
        <Stack gap={12} p={20} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {messages.map((msg, index) => {
            const id = String(msg.id ?? '')
            const highlighted = highlightedMessageId && id === highlightedMessageId
            return (
              <Box
                key={id || index}
                ref={(el) => {
                  setMessageRef(id, el)
                }}
                p="10px 14px"
                maw="75%"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.role === 'user' ? 'var(--color-accent)' : 'var(--color-surface-2)',
                  color: msg.role === 'user' ? 'var(--color-surface)' : 'var(--color-text)',
                  borderBottomRightRadius: msg.role === 'user' ? 6 : undefined,
                  borderBottomLeftRadius: msg.role === 'cornie' ? 6 : undefined,
                  boxShadow: highlighted
                    ? '0 0 0 3px color-mix(in srgb, var(--color-accent) 18%, transparent), 0 12px 24px color-mix(in srgb, var(--color-accent) 14%, transparent)'
                    : undefined,
                }}
              >
                <Text fz="var(--text-xs)" opacity={0.6} mb={3}>
                  {msg.role === 'user' ? '你' : '铃湾'}
                </Text>
                <Text fz="var(--text-md)" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {msg.content}
                </Text>
              </Box>
            )
          })}
        </Stack>
      )}

      {loading && messages.length > 0 ? (
        <Group justify="center" py={8}>
          <Loader size="sm" type="dots" />
        </Group>
      ) : null}
    </Stack>
  )
}
