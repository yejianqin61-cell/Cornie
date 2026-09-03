import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  UnstyledButton,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'

import { createObservation, deleteObservation, listObservations } from '../api'
import { today } from '../utils/date'
import { useDebouncedValue } from '../hooks/useTimers'
import { useRequestGuard } from '../hooks/useRequestGuard'

// 观察列表页（React 版 ObservationList.vue）。
// FE-05 竞态守卫与 FE-04 防抖搜索契约保持；原生 confirm 删除改 Mantine Modal。

const OBSERVATION_TYPES = [
  { value: '', label: '全部小事' },
  { value: 'event', label: '生活事件' },
  { value: 'fact', label: '事实片段' },
  { value: 'emotion', label: '情绪变化' },
  { value: 'preference', label: '偏好线索' },
  { value: 'misc', label: '小事记录' },
]

const TYPE_MAP: Record<string, string> = Object.fromEntries(
  OBSERVATION_TYPES.filter((item) => item.value).map((item) => [item.value, item.label])
)

interface ObservationItem {
  id?: string
  date?: string
  type?: string
  title?: string
  content?: string
  [key: string]: unknown
}

interface HistoryGroup {
  date: string
  label: string
  count: number
  items: ObservationItem[]
}

function formatDateLabel(date: string): string {
  if (!date) return '未命名日期'
  if (date === today()) return `今天 · ${date}`
  return date
}

function truncated(text: unknown, maxLen = 100): string {
  const value = text ? String(text) : ''
  if (!value) return ''
  return value.length > maxLen ? `${value.slice(0, maxLen)}…` : value
}

export default function ObservationListPage() {
  const navigate = useNavigate()
  const obsGuard = useRequestGuard()

  const [observations, setObservations] = useState<ObservationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [newForm, setNewForm] = useState({ title: '', content: '' })
  const [adding, setAdding] = useState(false)

  const [activeTab, setActiveTab] = useState('today')
  const [selectedDate, setSelectedDate] = useState(today())
  const [selectedType, setSelectedType] = useState('')
  const [keyword, setKeyword] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab
  const selectedDateRef = useRef(selectedDate)
  selectedDateRef.current = selectedDate
  const selectedTypeRef = useRef(selectedType)
  selectedTypeRef.current = selectedType
  const keywordRef = useRef(keyword)
  keywordRef.current = keyword

  const groupedHistory = useMemo<HistoryGroup[]>(() => {
    const groups = new Map<string, ObservationItem[]>()
    for (const item of observations) {
      const key = String(item.date || 'unknown')
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(item)
    }
    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      label: formatDateLabel(date),
      count: items.length,
      items,
    }))
  }, [observations])

  const archiveDates = useMemo(
    () => groupedHistory.map((group) => ({ date: group.date, label: group.label, count: group.count })),
    [groupedHistory]
  )

  const refresh = useCallback(async (): Promise<void> => {
    const { token, signal } = obsGuard.begin('list')
    setLoading(true)
    setErrorMsg('')
    try {
      if (activeTabRef.current === 'today') {
        const data = (await listObservations({ date: today(), limit: 100, signal })) as {
          observations?: ObservationItem[]
        }
        if (!obsGuard.isCurrent('list', token)) return
        setObservations(data?.observations || [])
        setSelectedDate(today())
        return
      }

      const hasQuery = keywordRef.current.trim().length > 0
      const hasDate = selectedDateRef.current && selectedDateRef.current !== today()
      const data = (await listObservations({
        date: !hasQuery && hasDate ? selectedDateRef.current : undefined,
        from: hasQuery ? undefined : selectedDateRef.current || undefined,
        to: hasQuery ? undefined : selectedDateRef.current || undefined,
        type: selectedTypeRef.current || undefined,
        q: keywordRef.current.trim() || undefined,
        limit: 200,
        signal,
      })) as { observations?: ObservationItem[] }
      if (!obsGuard.isCurrent('list', token)) return
      setObservations(data?.observations || [])
    } catch (e) {
      if (!obsGuard.isCurrent('list', token)) return
      setErrorMsg((e as { message?: string })?.message || '加载失败，请稍后再试')
    } finally {
      if (obsGuard.isCurrent('list', token)) {
        setLoading(false)
        obsGuard.end('list', token)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addObservation = async (): Promise<void> => {
    const title = newForm.title.trim()
    const content = newForm.content.trim()
    if (!title || !content || adding) return

    setAdding(true)
    try {
      await createObservation({ title, content, type: 'misc' })
      setNewForm({ title: '', content: '' })
      setShowAdd(false)
      await refresh()
    } catch (e) {
      setErrorMsg((e as { message?: string })?.message || '保存失败，请稍后再试')
    } finally {
      setAdding(false)
    }
  }

  const removeObservation = async (id: string | undefined): Promise<void> => {
    if (!id) return
    try {
      await deleteObservation(id)
      setPendingDeleteId(null)
      await refresh()
    } catch (e) {
      setErrorMsg((e as { message?: string })?.message || '删除失败，请稍后再试')
    }
  }

  const setTab = (tab: string) => {
    setActiveTab(tab)
    if (tab === 'today') {
      setSelectedDate(today())
      setSelectedType('')
      setKeyword('')
    }
  }

  useEffect(() => {
    void refresh()
  }, [activeTab, selectedDate, selectedType, refresh])

  // FE-04：防抖搜索（组件卸载自动清理）
  useDebouncedValue(keyword, 220, () => {
    void refresh()
  })

  return (
    <Stack gap={12} h="100%" style={{ overflow: 'hidden' }}>
      <Group gap={14} wrap="nowrap">
        <Button variant="subtle" onClick={() => navigate('/observe')}>
          ← 返回
        </Button>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fz="var(--text-xl)" fw={800}>
            观察记录
          </Text>
        </Box>
        <Button onClick={() => setShowAdd((prev) => !prev)}>{showAdd ? '先不记了' : '记一件小事'}</Button>
      </Group>

      <Group gap={8}>
        {[
          { key: 'today', label: '今天的小事' },
          { key: 'history', label: '回翻以前' },
        ].map((tab) => (
          <Button
            key={tab.key}
            size="compact-sm"
            radius="xl"
            variant={activeTab === tab.key ? 'light' : 'default'}
            color={activeTab === tab.key ? 'brand' : 'gray'}
            fw={600}
            onClick={() => setTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </Group>

      {errorMsg ? (
        <Alert color="danger" variant="light">
          {errorMsg}
        </Alert>
      ) : null}

      {showAdd ? (
        <Card p={16} withBorder={false}>
          <Stack gap={10}>
            <Text fw={700}>记下一件小事</Text>
            <TextInput
              placeholder="标题，比如：今天中午吃了粿条"
              value={newForm.title}
              onChange={(e) => {
                const { value } = e.currentTarget
                setNewForm((prev) => ({ ...prev, title: value }))
              }}
            />
            <Textarea
              placeholder="补充细节"
              minRows={3}
              autosize
              value={newForm.content}
              onChange={(e) => {
                const { value } = e.currentTarget
                setNewForm((prev) => ({ ...prev, content: value }))
              }}
            />
            <Button disabled={adding || !newForm.title.trim()} onClick={() => void addObservation()} w="fit-content">
              {adding ? '保存中…' : '保存这件小事'}
            </Button>
          </Stack>
        </Card>
      ) : null}

      {activeTab === 'history' ? (
        <Group gap={12} align="flex-end" wrap="wrap">
          <Stack gap={6} miw={150}>
            <Text fz="var(--text-sm)" c="dimmed">
              日期
            </Text>
            <DateInput
              valueFormat="YYYY-MM-DD"
              value={selectedDate || undefined}
              onChange={(value) => setSelectedDate(value ? String(value) : '')}
              clearable
            />
          </Stack>
          <Stack gap={6} miw={150}>
            <Text fz="var(--text-sm)" c="dimmed">
              类别
            </Text>
            <Select
              data={OBSERVATION_TYPES.map((item) => ({ value: item.value, label: item.label }))}
              value={selectedType}
              onChange={(value) => setSelectedType(value || '')}
              allowDeselect={false}
            />
          </Stack>
          <Stack gap={6} style={{ flex: 1, minWidth: 200 }}>
            <Text fz="var(--text-sm)" c="dimmed">
              关键词
            </Text>
            <TextInput
              placeholder="比如：龙虾、考试"
              value={keyword}
              onChange={(e) => setKeyword(e.currentTarget.value)}
            />
          </Stack>
        </Group>
      ) : null}

      {loading ? (
        <Text ta="center" c="dimmed" p={30}>
          加载中…
        </Text>
      ) : activeTab === 'today' ? (
        observations.length === 0 ? (
          <Text ta="center" c="dimmed" p={40}>
            今天还没有观察记录
          </Text>
        ) : (
          <Stack gap={8} style={{ flex: 1, overflowY: 'auto', paddingRight: 2, minHeight: 0 }}>
            {observations.map((obs) => (
              <Card
                key={String(obs.id)}
                p="14px 16px"
                withBorder={false}
                onClick={() => navigate(`/observe/detail/${obs.id}`)}
              >
                <Stack gap={8}>
                  <Group justify="space-between" align="flex-start" gap={10}>
                    <Box>
                      <Text fw={600}>{obs.title}</Text>
                      <Group gap={8} mt={4} wrap="wrap">
                        <Badge variant="light" color="gray">
                          {TYPE_MAP[String(obs.type || '')] || '小事记录'}
                        </Badge>
                        <Text fz="var(--text-sm)" c="dimmed">
                          {obs.date}
                        </Text>
                      </Group>
                    </Box>
                  </Group>
                  <Text fz="var(--text-base)" c="dimmed" lh={1.6}>
                    {truncated(obs.content || '暂无内容', 140)}
                  </Text>
                  <Button
                    variant="subtle"
                    color="danger"
                    size="compact-sm"
                    w="fit-content"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPendingDeleteId(String(obs.id))
                    }}
                  >
                    删除这条
                  </Button>
                </Stack>
              </Card>
            ))}
          </Stack>
        )
      ) : (
        <Box style={{ minHeight: 0, flex: 1, display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: 12 }}>
          {/* 回翻日期侧栏 */}
          <Stack gap={8} style={{ overflowY: 'auto', minHeight: 0 }}>
            <Text fw={700} fz="var(--text-base)">
              回翻日期
            </Text>
            {archiveDates.map((item) => (
              <UnstyledButton
                key={item.date}
                onClick={() => setSelectedDate(item.date)}
                px={12}
                py={10}
                style={{
                  borderRadius: 'var(--radius-md)',
                  background: selectedDate === item.date ? 'brand.0' : 'transparent',
                }}
              >
                <Group justify="space-between" gap={8}>
                  <Text fz="var(--text-sm)">{item.label}</Text>
                  <Text fz="var(--text-sm)" c="dimmed">
                    {item.count}
                  </Text>
                </Group>
              </UnstyledButton>
            ))}
            {archiveDates.length === 0 ? (
              <Text c="dimmed" fz="var(--text-sm)" py={10}>
                暂无匹配结果
              </Text>
            ) : null}
          </Stack>

          {/* 分组内容 */}
          <Box style={{ minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
            {groupedHistory.length === 0 ? (
              <Text ta="center" c="dimmed" p={40}>
                没有匹配的小事
              </Text>
            ) : (
              <Stack gap={16}>
                {groupedHistory.map((group) => (
                  <Box key={group.date}>
                    <Group justify="space-between" mb={12}>
                      <Text fz="var(--text-lg)" fw={700}>
                        {group.label}
                      </Text>
                      <Text fz="var(--text-sm)" c="dimmed">
                        {group.count} 条
                      </Text>
                    </Group>
                    <Stack gap={10}>
                      {group.items.map((obs) => (
                        <UnstyledButton
                          key={String(obs.id)}
                          onClick={() => navigate(`/observe/detail/${obs.id}`)}
                          p="12px 14px"
                          style={{
                            borderRadius: 'var(--radius-md)',
                            display: 'block',
                            textAlign: 'left',
                            width: '100%',
                          }}
                        >
                          <Group justify="space-between" align="flex-start" gap={10}>
                            <Text fw={600}>{obs.title}</Text>
                            <Badge variant="light" color="gray">
                              {TYPE_MAP[String(obs.type || '')] || '小事记录'}
                            </Badge>
                          </Group>
                          <Text fz="var(--text-base)" c="dimmed" mt={4} lh={1.6}>
                            {truncated(obs.content || '暂无内容', 150)}
                          </Text>
                        </UnstyledButton>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      )}

      {/* 删除确认 */}
      <Modal opened={!!pendingDeleteId} onClose={() => setPendingDeleteId(null)} title="删除观察" size={380}>
        <Stack gap="md">
          <Text fz="var(--text-base)">确认删除这条观察？删除后无法恢复。</Text>
          <Group justify="flex-end" gap={8}>
            <Button variant="subtle" onClick={() => setPendingDeleteId(null)}>
              先留着
            </Button>
            <Button color="danger" onClick={() => void removeObservation(pendingDeleteId ?? undefined)}>
              确定删除
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
