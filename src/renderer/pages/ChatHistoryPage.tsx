import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Group, Paper, Select, Stack, Text, TextInput, UnstyledButton } from '@mantine/core'

import {
  exportChatlogByDate,
  exportChatlogByMonth,
  getChatlog,
  listChatlogDates,
  type ChatlogListPagination,
  type ChatlogDayResult,
} from '../api'
import { useRequestGuard } from '../hooks/useRequestGuard'

// 聊天记录页（React 版 ChatHistory.vue）：
// 左侧日期列表（范围/月份/关键词过滤 + 分页），右侧当日消息（分页 + 导出）。
// FE-05：日期与消息加载均接竞态守卫（消息守卫为原版契约，日期守卫为本次补齐）。

interface HistoryEntry {
  date?: string
  matchedPreview?: string
  matchedCount?: number
  messageCount?: number
  [key: string]: unknown
}

interface HistoryMessage {
  id?: string | number
  role?: string
  content?: string
  matchedPreview?: string
  [key: string]: unknown
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const DEFAULT_DATE_PAGINATION: ChatlogListPagination = {
  cursor: '0',
  nextCursor: null,
  hasMore: false,
  pageSize: 100,
  total: 0,
}

export default function ChatHistoryPage() {
  const navigate = useNavigate()
  const historyGuard = useRequestGuard()

  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedScope, setSelectedScope] = useState('all')
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()))
  const [searchQuery, setSearchQuery] = useState('')
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [messages, setMessages] = useState<HistoryMessage[]>([])
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [datePagination, setDatePagination] = useState<ChatlogListPagination>(DEFAULT_DATE_PAGINATION)
  const [messagePagination, setMessagePagination] = useState<ChatlogListPagination>(DEFAULT_DATE_PAGINATION)
  const [messageSearchMeta, setMessageSearchMeta] = useState<{ query: string; mode: string }>({
    query: '',
    mode: 'browse',
  })
  const [loadingDates, setLoadingDates] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const selectedDateRef = useRef(selectedDate)
  selectedDateRef.current = selectedDate
  const searchQueryRef = useRef(searchQuery)
  searchQueryRef.current = searchQuery

  const selectedLabel = selectedDate || '未选择日期'
  const selectedMonthLabel = selectedMonth
    ? (() => {
        const [year, month] = selectedMonth.split('-')
        return `${year}年${Number(month)}月`
      })()
    : '全部历史'
  const selectedScopeLabel =
    selectedScope === 'recent_30_days' ? '最近30天' : selectedScope === 'month' ? selectedMonthLabel : '全部历史'
  const historySummary = (() => {
    const total = Number(datePagination?.total ?? entries.length)
    const query = searchQuery.trim()
    if (query) return `搜索“${query}”命中 ${total} 个聊天日期`
    return `${selectedScopeLabel} · ${total} 个聊天日期`
  })()

  const refreshDates = useCallback(async (): Promise<void> => {
    const { token } = historyGuard.begin('dates')
    setLoadingDates(true)
    setErrorMsg('')
    try {
      const data = await listChatlogDates({
        month: selectedMonth || undefined,
        scope: selectedScope,
        query: searchQuery.trim() || undefined,
        limit: 60,
        cursor: 0,
      })
      if (!historyGuard.isCurrent('dates', token)) return
      const nextEntries = (data.entries || []) as HistoryEntry[]
      setEntries(nextEntries)
      setAvailableMonths(data.availableMonths || [])
      setDatePagination(
        data.pagination || {
          ...DEFAULT_DATE_PAGINATION,
          total: nextEntries.length,
        }
      )
      const current = selectedDateRef.current
      if (!nextEntries.find((item) => item.date === current) && nextEntries.length > 0) {
        setSelectedDate(String(nextEntries[0].date || ''))
      }
      if (nextEntries.length === 0) {
        setMessages([])
      }
    } catch (error) {
      if (!historyGuard.isCurrent('dates', token)) return
      setErrorMsg((error as { message?: string })?.message || String(error))
    } finally {
      if (historyGuard.isCurrent('dates', token)) {
        setLoadingDates(false)
        historyGuard.end('dates', token)
      }
    }
    // historyGuard 方法为稳定引用
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedScope, searchQuery])

  const refreshMessages = useCallback(
    async (date: string): Promise<void> => {
      if (!date) {
        setMessages([])
        return
      }

      const { token, signal } = historyGuard.begin('messages')
      setLoadingMessages(true)
      setErrorMsg('')
      try {
        const data = (await getChatlog(date, {
          limit: 80,
          cursor: 0,
          query: searchQueryRef.current.trim() || undefined,
          signal,
        })) as ChatlogDayResult
        if (!historyGuard.isCurrent('messages', token)) return
        setMessages((data.messages || []) as HistoryMessage[])
        setMessagePagination(data.pagination || { ...DEFAULT_DATE_PAGINATION })
        setMessageSearchMeta(
          (data as { searchMeta?: { query: string; mode: string } }).searchMeta || { query: '', mode: 'browse' }
        )
      } catch (error) {
        if (!historyGuard.isCurrent('messages', token)) return
        setErrorMsg((error as { message?: string })?.message || String(error))
        setMessages([])
      } finally {
        if (historyGuard.isCurrent('messages', token)) {
          setLoadingMessages(false)
          historyGuard.end('messages', token)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const loadMoreDates = useCallback(async (): Promise<void> => {
    if (loadingDates || !datePagination?.hasMore) return
    setLoadingDates(true)
    setErrorMsg('')
    try {
      const data = await listChatlogDates({
        month: selectedMonth || undefined,
        scope: selectedScope,
        query: searchQuery.trim() || undefined,
        limit: datePagination.pageSize || 60,
        cursor: datePagination.nextCursor,
      })
      setEntries((prev) => [...prev, ...((data.entries || []) as HistoryEntry[])])
      setDatePagination(data.pagination || datePagination)
    } catch (error) {
      setErrorMsg((error as { message?: string })?.message || String(error))
    } finally {
      setLoadingDates(false)
    }
  }, [loadingDates, datePagination, selectedMonth, selectedScope, searchQuery])

  const loadMoreMessages = useCallback(async (): Promise<void> => {
    if (loadingMessages || !messagePagination?.hasMore || !selectedDate) return
    setLoadingMessages(true)
    setErrorMsg('')
    try {
      const data = (await getChatlog(selectedDate, {
        limit: messagePagination.pageSize || 80,
        cursor: messagePagination.nextCursor,
        query: searchQuery.trim() || undefined,
      })) as ChatlogDayResult
      setMessages((prev) => [...prev, ...((data.messages || []) as HistoryMessage[])])
      setMessagePagination(data.pagination || messagePagination)
      setMessageSearchMeta((data as { searchMeta?: { query: string; mode: string } }).searchMeta || messageSearchMeta)
    } catch (error) {
      setErrorMsg((error as { message?: string })?.message || String(error))
    } finally {
      setLoadingMessages(false)
    }
  }, [loadingMessages, messagePagination, selectedDate, searchQuery, messageSearchMeta])

  // 范围/月份/关键词变化 → 刷新日期列表；选中日期变化 → 刷新消息
  useEffect(() => {
    void refreshDates()
  }, [refreshDates])

  useEffect(() => {
    void refreshMessages(selectedDate)
  }, [selectedDate, refreshMessages])

  function openSelectedDate() {
    if (!selectedDate) return
    navigate(`/chat/day/${selectedDate}`)
  }

  function downloadExportFile(payload: { content?: string; contentType?: string; filename?: string }) {
    const blob = new Blob([payload.content || ''], { type: payload.contentType || 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = payload.filename || 'chatlog-export.txt'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const exportSelectedDate = async (format: string) => {
    if (!selectedDate) return
    setExporting(true)
    setErrorMsg('')
    try {
      const payload = (await exportChatlogByDate(selectedDate, { format })) as {
        content?: string
        contentType?: string
        filename?: string
      }
      downloadExportFile(payload)
    } catch (error) {
      setErrorMsg((error as { message?: string })?.message || String(error))
    } finally {
      setExporting(false)
    }
  }

  const exportSelectedMonth = async (format: string) => {
    if (!selectedMonth) return
    setExporting(true)
    setErrorMsg('')
    try {
      const payload = (await exportChatlogByMonth(selectedMonth, { format })) as {
        content?: string
        contentType?: string
        filename?: string
      }
      downloadExportFile(payload)
    } catch (error) {
      setErrorMsg((error as { message?: string })?.message || String(error))
    } finally {
      setExporting(false)
    }
  }

  return (
    <Box
      h="100%"
      style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: 14,
        minHeight: 0,
      }}
    >
      {/* 侧栏：日期列表 */}
      <Paper
        p={0}
        radius="lg"
        withBorder
        style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <Box p="14px 16px" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Group gap={10}>
            <Button variant="subtle" size="compact-sm" px={10} onClick={() => navigate('/chat')}>
              ← 返回聊天
            </Button>
            <Text fw={700}>聊天记录</Text>
          </Group>
          <Stack gap={8} mt={10}>
            <Group gap={8} wrap="nowrap">
              <Select
                w={140}
                size="sm"
                allowDeselect={false}
                data={[
                  { value: 'all', label: '全部历史' },
                  { value: 'recent_30_days', label: '最近30天' },
                  { value: 'month', label: '指定月份' },
                ]}
                value={selectedScope}
                onChange={(value) => setSelectedScope(value || 'all')}
              />
              <Select
                w={140}
                size="sm"
                allowDeselect={false}
                data={[
                  { value: '__all__', label: '全部历史' },
                  ...availableMonths.map((month) => ({ value: month, label: month })),
                ]}
                value={selectedMonth === '' ? '__all__' : selectedMonth}
                onChange={(value) => setSelectedMonth(!value || value === '__all__' ? '' : value)}
              />
              <TextInput
                flex={1}
                miw={0}
                size="sm"
                type="search"
                placeholder="搜索聊天关键词"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
              />
            </Group>
          </Stack>
          {selectedScope === 'recent_30_days' && datePagination.total > 0 ? (
            <Text fz="var(--text-sm)" c="dimmed" mt={8}>
              当前视角：最近 30 天历史归档
            </Text>
          ) : null}
          <Text fz="var(--text-sm)" c="dimmed" mt={8}>
            {historySummary}
          </Text>
        </Box>

        <Stack gap={6} p={10} style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
          {entries.map((item) => {
            const date = String(item.date || '')
            const active = date === selectedDate
            return (
              <UnstyledButton
                key={date}
                onClick={() => setSelectedDate(date)}
                px={12}
                py={10}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  background: active ? 'brand.0' : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 8,
                  textAlign: 'left',
                }}
              >
                <Stack gap={4} style={{ minWidth: 0 }}>
                  <Text fz="var(--text-md)">{date}</Text>
                  {item.matchedPreview ? (
                    <Text fz="var(--text-sm)" c="dimmed" truncate>
                      {item.matchedPreview}
                    </Text>
                  ) : null}
                </Stack>
                <Text fz="var(--text-sm)" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {item.matchedCount ? `${item.matchedCount} 命中` : `${item.messageCount ?? 0} 条`}
                </Text>
              </UnstyledButton>
            )
          })}
          {entries.length === 0 && !loadingDates ? (
            <Text ta="center" fz="var(--text-base)" c="dimmed" p="20px 12px">
              {searchQuery.trim() ? '没有找到相关聊天记录' : '这里还没有聊天记录'}
            </Text>
          ) : null}
          {datePagination.hasMore ? (
            <Button
              variant="subtle"
              size="compact-sm"
              w="fit-content"
              mx="auto"
              mt={8}
              disabled={loadingDates}
              onClick={() => void loadMoreDates()}
            >
              {loadingDates ? '加载中…' : '查看更多日期'}
            </Button>
          ) : null}
        </Stack>
      </Paper>

      {/* 内容：当日消息 */}
      <Paper
        p={0}
        radius="lg"
        withBorder
        style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}
      >
        <Box p="14px 16px" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Box>
              <Text fw={700}>{selectedLabel}</Text>
              <Text fz="var(--text-sm)" c="dimmed" mt={4}>
                {loadingMessages ? '加载中…' : `${messagePagination.total || messages.length} 条消息`}
              </Text>
              {messageSearchMeta.query ? (
                <Text fz="var(--text-sm)" c="dimmed" mt={4}>
                  当前按“{messageSearchMeta.query}”筛选这一天的命中消息
                </Text>
              ) : null}
            </Box>
            <Group gap={8} justify="flex-end" wrap="wrap">
              <Button
                variant="subtle"
                disabled={exporting || !selectedMonth}
                onClick={() => void exportSelectedMonth('json')}
              >
                {exporting ? '导出中…' : '导出本月 JSON'}
              </Button>
              <Button
                variant="subtle"
                disabled={exporting || !selectedDate}
                onClick={() => void exportSelectedDate('txt')}
              >
                {exporting ? '导出中…' : '导出当日 TXT'}
              </Button>
              <Button
                disabled={loadingMessages || !selectedDate}
                onClick={openSelectedDate}
                style={{ flex: '0 0 auto' }}
              >
                查看这一天
              </Button>
            </Group>
          </Group>
        </Box>

        {errorMsg ? (
          <Alert color="danger" variant="light" m={16} mb={0}>
            {errorMsg}
          </Alert>
        ) : null}

        {messages.length === 0 && !loadingMessages ? (
          <Text c="dimmed" m={16} p={12} style={{ borderRadius: 'var(--radius-md)' }}>
            这一天还没有聊天记录。
          </Text>
        ) : (
          <Stack gap={10} p={16} style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
            {messages.map((msg, index) => (
              <Box
                key={String(msg.id ?? index)}
                p="10px 14px"
                maw="80%"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.role === 'user' ? 'var(--color-accent)' : 'var(--color-surface-2)',
                  color: msg.role === 'user' ? 'var(--color-surface)' : 'var(--color-text)',
                  borderBottomRightRadius: msg.role === 'user' ? 6 : undefined,
                  borderBottomLeftRadius: msg.role === 'cornie' ? 6 : undefined,
                }}
              >
                <Text fz="var(--text-xs)" opacity={0.6} mb={3}>
                  {msg.role === 'user' ? '你' : '铃湾'}
                </Text>
                <Text fz="var(--text-md)" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {msg.content}
                </Text>
                {searchQuery.trim() && msg.matchedPreview ? (
                  <Text
                    fz="var(--text-sm)"
                    c="dimmed"
                    mt={6}
                    style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                  >
                    {msg.matchedPreview}
                  </Text>
                ) : null}
              </Box>
            ))}
            {messagePagination.hasMore ? (
              <Button
                variant="subtle"
                size="compact-sm"
                w="fit-content"
                mx="auto"
                mt={8}
                disabled={loadingMessages}
                onClick={() => void loadMoreMessages()}
              >
                {loadingMessages ? '加载中…' : '查看更多消息'}
              </Button>
            ) : null}
          </Stack>
        )}
      </Paper>
    </Box>
  )
}
