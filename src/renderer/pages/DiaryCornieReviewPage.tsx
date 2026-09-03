import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MonthPickerInput } from '@mantine/dates'
import { Box, Button, Card, Group, Stack, Text, UnstyledButton } from '@mantine/core'

import { getEntry, listEntries } from '../api'
import { useRequestGuard } from '../hooks/useRequestGuard'
import CornieDiaryMarkdown from '../components/diary/CornieDiaryMarkdown'
import { today } from '../utils/date'

// 铃湾日记回顾页（React 版 CornieDiaryReview.vue）。
// 修复旧版契约 bug：列表接口只返回 {date,hasUserText,hasCornieText}，旧版却渲染行内
// cornieText 摘要导致恒为「暂无内容」——本版卡片显示日期 + 有无标记，全文点击后取详情。
// openEntry 接竞态守卫（旧版仅 detailLoading 防重入）。

interface MonthEntry {
  date?: string
  hasUserText?: boolean
  hasCornieText?: boolean
  [key: string]: unknown
}

interface DiaryEntryData {
  userText?: string
  cornieText?: string
  [key: string]: unknown
}

export default function DiaryCornieReviewPage() {
  const navigate = useNavigate()
  const reviewGuard = useRequestGuard()

  const [selectedMonth, setSelectedMonth] = useState(() => today().slice(0, 7))
  const [entries, setEntries] = useState<MonthEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [activeDate, setActiveDate] = useState('')
  const [activeEntry, setActiveEntry] = useState<DiaryEntryData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    const { token } = reviewGuard.begin('list')
    setLoading(true)
    try {
      const data = (await listEntries({ month: selectedMonth })) as { entries?: MonthEntry[] }
      if (!reviewGuard.isCurrent('list', token)) return
      const withCornie = (data.entries || []).filter((e) => e.hasCornieText)
      setEntries(withCornie)
      // 选中日期不在新列表中时清空详情（与旧版一致）
      setActiveDate((prevDate) => {
        if (prevDate && !withCornie.some((item) => item.date === prevDate)) {
          setActiveEntry(null)
          return ''
        }
        return prevDate
      })
    } catch {
      /* ignore */
    } finally {
      if (reviewGuard.isCurrent('list', token)) {
        setLoading(false)
        reviewGuard.end('list', token)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  const openEntry = useCallback(
    async (date: string): Promise<void> => {
      if (!date) return
      const { token, signal } = reviewGuard.begin('detail')
      setDetailLoading(true)
      try {
        const data = (await getEntry(date, { signal })) as { entry?: DiaryEntryData }
        if (!reviewGuard.isCurrent('detail', token)) return
        setActiveDate(date)
        setActiveEntry(data?.entry || null)
      } catch {
        if (!reviewGuard.isCurrent('detail', token)) return
        setActiveDate(date)
        setActiveEntry({ cornieText: '加载失败，请稍后再试' })
      } finally {
        if (reviewGuard.isCurrent('detail', token)) {
          setDetailLoading(false)
          reviewGuard.end('detail', token)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <Stack gap={14} h="100%" style={{ overflow: 'hidden' }}>
      <Group gap={14} wrap="nowrap">
        <Button variant="subtle" onClick={() => navigate('/diary')}>
          ← 返回日记首页
        </Button>
        <Text fz="var(--text-xl)" fw={800}>
          铃湾的日记
        </Text>
        <MonthPickerInput
          ml="auto"
          w={140}
          size="sm"
          valueFormat="YYYY-MM"
          placeholder="选择月份"
          value={selectedMonth || null}
          onChange={(value) => setSelectedMonth(value ? String(value).slice(0, 7) : '')}
          clearable
        />
      </Group>

      {loading ? (
        <Text ta="center" c="dimmed" py={40}>
          加载中…
        </Text>
      ) : entries.length === 0 ? (
        <Text ta="center" c="dimmed" py={40}>
          这个月还没有日记
        </Text>
      ) : (
        <Stack gap={10} style={{ overflowY: 'auto', paddingRight: 2, minHeight: 0 }}>
          {entries.map((e) => {
            const date = String(e.date || '')
            const active = activeDate === date
            return (
              <UnstyledButton
                key={date}
                onClick={() => void openEntry(date)}
                p={16}
                style={{ textAlign: 'left', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}
                className={active ? 'review-card-active' : undefined}
              >
                <Text fw={700} mb={6}>
                  {date}
                </Text>
                <Text fz="var(--text-base)" c="brand.7">
                  {active ? '正在查看这一天的全文 ↓' : '点击查看这一天的全文'}
                </Text>
              </UnstyledButton>
            )
          })}
        </Stack>
      )}

      {activeEntry?.cornieText || detailLoading ? (
        <Card p="18px 20px" withBorder>
          <Stack gap={12}>
            <Text fz="var(--text-lg)" fw={800}>
              {activeDate || '铃湾日记'}
            </Text>
            {detailLoading ? (
              <Text c="dimmed" fz="var(--text-base)">
                加载中…
              </Text>
            ) : (
              <Box lh={1.8} style={{ color: 'brand.8' }}>
                <CornieDiaryMarkdown content={activeEntry?.cornieText || ''} />
              </Box>
            )}
          </Stack>
        </Card>
      ) : null}
    </Stack>
  )
}
