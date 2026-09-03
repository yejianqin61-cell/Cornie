import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Month, DateTimePicker, type DayProps } from '@mantine/dates'
import { Alert, Box, Badge, Button, Card, Group, Modal, Select, Stack, Text, TextInput } from '@mantine/core'
import dayjs from 'dayjs'

import {
  cancelSchedule,
  createSchedule,
  deleteSchedule,
  listScheduleCategories,
  listSchedules,
  restoreSchedule,
} from '../api'
import { listenDataChanged } from '../syncSignals'
import { useRequestGuard } from '../hooks/useRequestGuard'
import { formatDate } from '../utils/date'

// 日程首页（React 版 ScheduleHome.vue + ScheduleCalendar.vue）。
// 月历底座由 Mantine Month 接管（单点标记=当日有安排）；新增表单用 DateTimePicker
// （提交前格式化为旧契约的 'YYYY-MM-DDTHH:mm' 字符串）；删除改 Modal 确认；
// refresh 接竞态守卫（规格 03 风险项）。

interface ScheduleItem {
  id?: string | number
  title?: string
  startAt?: string
  endAt?: string
  status?: string
  categoryName?: string
  categoryId?: string
  location?: string
  [key: string]: unknown
}

interface ScheduleCategory {
  id?: string | number
  name?: string
  [key: string]: unknown
}

export default function ScheduleHomePage() {
  const scheduleGuard = useRequestGuard()

  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [categories, setCategories] = useState<ScheduleCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [newForm, setNewForm] = useState<{
    title: string
    startAt: string | null
    endAt: string | null
    categoryId: string
    location: string
  }>({ title: '', startAt: null, endAt: null, categoryId: '', location: '' })

  const [todayCount, setTodayCount] = useState(0)
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const todayDateKey = useMemo(() => formatDate(new Date()), [])
  const currentMonthRef = useRef(currentMonth)
  currentMonthRef.current = currentMonth

  const refresh = useCallback(async (): Promise<void> => {
    const { token } = scheduleGuard.begin('refresh')
    setLoading(true)
    try {
      const today = formatDate(new Date())
      const month = currentMonthRef.current
      const range = {
        from: formatDate(new Date(month.getFullYear(), month.getMonth(), 1)),
        to: formatDate(new Date(month.getFullYear(), month.getMonth() + 1, 0)),
      }
      const [schData, catData] = await Promise.all([
        listSchedules({ from: range.from, to: range.to }),
        listScheduleCategories(),
      ])
      if (!scheduleGuard.isCurrent('refresh', token)) return
      const items = ((schData as { items?: ScheduleItem[] })?.items || []) as ScheduleItem[]
      setSchedules(items)
      setCategories(((catData as { items?: ScheduleCategory[] })?.items || []) as ScheduleCategory[])
      setTodayCount(items.filter((s) => s.startAt?.startsWith(today)).length)
    } catch {
      /* ignore */
    } finally {
      if (scheduleGuard.isCurrent('refresh', token)) {
        setLoading(false)
        scheduleGuard.end('refresh', token)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void refresh()
    const stopListening = listenDataChanged((detail) => {
      if ((detail as { schedule?: boolean })?.schedule) void refresh()
    })
    return () => {
      stopListening()
    }
  }, [refresh])

  const toDateKey = useCallback((value: unknown): string => {
    if (!value) return ''
    const d = new Date(String(value))
    return Number.isNaN(d.getTime()) ? '' : formatDate(d)
  }, [])

  const scheduleDates = useMemo(() => new Set(schedules.map((item) => toDateKey(item.startAt))), [schedules, toDateKey])

  const filteredSchedules = useMemo(() => {
    if (!selectedDate) return schedules
    return schedules.filter((item) => toDateKey(item.startAt) === selectedDate)
  }, [schedules, selectedDate, toDateKey])

  const addSchedule = async (): Promise<void> => {
    const title = newForm.title.trim()
    if (!title || !newForm.startAt || adding) return
    setAdding(true)
    setErrorMsg('')
    try {
      const cat = categories.find((c) => String(c.id) === String(newForm.categoryId))
      await createSchedule({
        title,
        // DateTimePicker 值为 'YYYY-MM-DD HH:mm' 字符串，转换为旧契约的 'T' 分隔格式
        startAt: newForm.startAt ? dayjs(new Date(newForm.startAt.replace(' ', 'T'))).format('YYYY-MM-DDTHH:mm') : null,
        endAt: newForm.endAt ? dayjs(new Date(newForm.endAt.replace(' ', 'T'))).format('YYYY-MM-DDTHH:mm') : null,
        categoryId: newForm.categoryId || null,
        categoryName: cat?.name || null,
        location: newForm.location || null,
        status: 'active',
      })
      setNewForm({ title: '', startAt: null, endAt: null, categoryId: '', location: '' })
      setShowForm(false)
      await refresh()
    } catch (e) {
      setErrorMsg((e as { message?: string })?.message || '添加失败')
    } finally {
      setAdding(false)
    }
  }

  const moveMonth = async (delta: number) => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1)
    setCurrentMonth(next)
    setSelectedDate('')
    currentMonthRef.current = next
    await refresh()
  }

  const jumpToToday = async () => {
    const now = new Date()
    const next = new Date(now.getFullYear(), now.getMonth(), 1)
    setCurrentMonth(next)
    setSelectedDate(formatDate(now))
    currentMonthRef.current = next
    await refresh()
  }

  const toggleStatus = async (sch: ScheduleItem): Promise<void> => {
    try {
      if (sch.status === 'cancelled') {
        await restoreSchedule(String(sch.id))
      } else {
        await cancelSchedule(String(sch.id))
      }
      await refresh()
    } catch (e) {
      setErrorMsg((e as { message?: string })?.message || '操作失败')
    }
  }

  const removeSchedule = async (id: string | undefined): Promise<void> => {
    if (!id) return
    try {
      await deleteSchedule(id)
      setPendingDeleteId(null)
      await refresh()
    } catch (e) {
      setErrorMsg((e as { message?: string })?.message || '删除失败')
    }
  }

  const pendingDelete = pendingDeleteId ? schedules.find((s) => String(s.id) === pendingDeleteId) : null

  const renderDay: DayProps['renderDay'] = (date) => {
    const key = String(date)
    const hasEntries = scheduleDates.has(key)
    const isToday = key === todayDateKey
    return (
      <Stack gap={2} align="center" justify="center">
        <Text
          fz="var(--text-base)"
          lh={1}
          style={isToday ? { color: 'var(--color-success)', fontWeight: 700 } : undefined}
        >
          {Number(key.slice(8, 10))}
        </Text>
        {hasEntries ? <Box w={6} h={6} style={{ borderRadius: 999, background: 'var(--color-accent)' }} /> : null}
      </Stack>
    )
  }

  return (
    <Stack gap={12} h="100%" style={{ overflowY: 'auto', paddingRight: 4 }}>
      {/* 摘要 */}
      <Card p="12px 20px" bg="var(--color-tint-schedule)" withBorder={false} ta="center">
        <Text fz="var(--text-md)">
          今天有{' '}
          <Text component="strong" inherit>
            {todayCount}
          </Text>{' '}
          项安排
        </Text>
      </Card>

      {/* 月历 */}
      <Card p="14px 16px" withBorder={false}>
        <Group justify="space-between" gap={10}>
          <Button variant="subtle" size="compact-sm" style={{ borderRadius: 999 }} onClick={() => void moveMonth(-1)}>
            上个月
          </Button>
          <Text fz="var(--text-md)" fw={700}>
            {`${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`}
          </Text>
          <Button variant="subtle" size="compact-sm" style={{ borderRadius: 999 }} onClick={() => void moveMonth(1)}>
            下个月
          </Button>
        </Group>
        <Month
          mt={12}
          month={formatDate(currentMonth)}
          firstDayOfWeek={1}
          renderDay={renderDay}
          getDayProps={(date) => {
            const key = String(date)
            return {
              selected: key === selectedDate && key !== todayDateKey,
              onClick: () => setSelectedDate((prev) => (prev === key ? '' : key)),
            }
          }}
          styles={{
            day: { minHeight: 46, borderRadius: 'var(--radius-lg)' },
          }}
        />
      </Card>

      {/* 工具条 */}
      <Card p="12px 16px" withBorder={false}>
        <Group justify="space-between" gap={12} wrap="wrap">
          <Box style={{ minWidth: 0 }}>
            <Text fz="var(--text-xs)" c="dimmed">
              当前查看
            </Text>
            <Text fz="var(--text-base)">{selectedDate ? `正在看 ${selectedDate} 的安排` : '正在看这个月的安排'}</Text>
          </Box>
          <Group gap={8} justify="flex-end" wrap="wrap">
            <Button variant="subtle" onClick={() => void jumpToToday()}>
              回到今天
            </Button>
            <Button variant="subtle" disabled={!selectedDate} onClick={() => setSelectedDate('')}>
              清除筛选
            </Button>
            <Button onClick={() => setShowForm((prev) => !prev)}>{showForm ? '收起新增' : '新增安排'}</Button>
          </Group>
        </Group>
      </Card>

      {/* 新增表单 */}
      {showForm ? (
        <Card p="12px 16px" withBorder={false}>
          <Stack gap={8}>
            <Group justify="space-between">
              <Text fw={700}>新增安排</Text>
              <Button variant="subtle" onClick={() => setShowForm(false)}>
                取消
              </Button>
            </Group>
            <TextInput
              placeholder="标题"
              value={newForm.title}
              onChange={(e) => {
                const { value } = e.currentTarget
                setNewForm((prev) => ({ ...prev, title: value }))
              }}
            />
            <Group gap={8} wrap="nowrap" align="flex-start">
              <DateTimePicker
                flex={1}
                placeholder="开始时间"
                value={newForm.startAt}
                onChange={(value) => setNewForm((prev) => ({ ...prev, startAt: value }))}
                clearable
              />
              <DateTimePicker
                flex={1}
                placeholder="结束时间（可选）"
                value={newForm.endAt}
                onChange={(value) => setNewForm((prev) => ({ ...prev, endAt: value }))}
                clearable
              />
            </Group>
            <Group gap={8} wrap="nowrap">
              <Select
                flex={1}
                data={[
                  { value: '', label: '类目' },
                  ...categories.map((c) => ({ value: String(c.id), label: String(c.name) })),
                ]}
                value={newForm.categoryId}
                onChange={(value) => setNewForm((prev) => ({ ...prev, categoryId: value || '' }))}
                allowDeselect={false}
              />
              <TextInput
                flex={1}
                placeholder="地点（可选）"
                value={newForm.location}
                onChange={(e) => {
                  const { value } = e.currentTarget
                  setNewForm((prev) => ({ ...prev, location: value }))
                }}
              />
            </Group>
            <Button
              w="fit-content"
              disabled={adding || !newForm.title.trim() || !newForm.startAt}
              onClick={() => void addSchedule()}
            >
              {adding ? '保存中…' : '保存'}
            </Button>
            {errorMsg ? (
              <Alert color="danger" variant="light">
                {errorMsg}
              </Alert>
            ) : null}
          </Stack>
        </Card>
      ) : null}

      {/* 日程列表 */}
      <Card p="12px 20px" withBorder={false}>
        <Text fw={700} mb={10}>
          {selectedDate ? '这一天的安排' : '这个月的安排'}
        </Text>
        {filteredSchedules.length === 0 && !loading ? (
          <Text c="dimmed" fz="var(--text-base)" py={10}>
            还没有日程安排
          </Text>
        ) : (
          <Stack gap={4}>
            {filteredSchedules.map((s) => {
              const cancelled = s.status === 'cancelled'
              return (
                <Group
                  key={String(s.id)}
                  align="center"
                  gap={10}
                  px={14}
                  py={10}
                  wrap="nowrap"
                  style={{
                    borderRadius: 'var(--radius-sm)',
                    opacity: cancelled ? 0.4 : 1,
                  }}
                >
                  <Text fz="var(--text-sm)" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                    {s.startAt?.replace('T', ' ')}
                  </Text>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={500} truncate>
                      {s.title}
                    </Text>
                    <Group gap={6} mt={2}>
                      {s.categoryName ? (
                        <Badge size="xs" variant="light" color="gray">
                          {s.categoryName}
                        </Badge>
                      ) : null}
                      {s.location ? (
                        <Text fz="var(--text-xs)" c="dimmed">
                          {s.location}
                        </Text>
                      ) : null}
                    </Group>
                  </Box>
                  <Group gap={6}>
                    <Button variant="subtle" size="compact-sm" onClick={() => void toggleStatus(s)}>
                      {cancelled ? '恢复' : '取消'}
                    </Button>
                    <Button
                      variant="subtle"
                      color="danger"
                      size="compact-sm"
                      onClick={() => setPendingDeleteId(String(s.id))}
                    >
                      删除
                    </Button>
                  </Group>
                </Group>
              )
            })}
          </Stack>
        )}
      </Card>

      {/* 删除确认 */}
      <Modal opened={!!pendingDelete} onClose={() => setPendingDeleteId(null)} title="删除日程" size={380}>
        <Stack gap="md">
          <Text fz="var(--text-base)">
            确定删除这条日程吗？
            {pendingDelete?.title ? (
              <Text component="span" fw={700}>
                「{pendingDelete.title}」
              </Text>
            ) : null}
          </Text>
          <Group justify="flex-end" gap={8}>
            <Button variant="subtle" onClick={() => setPendingDeleteId(null)}>
              先留着
            </Button>
            <Button color="danger" onClick={() => void removeSchedule(pendingDeleteId ?? undefined)}>
              确定删除
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
