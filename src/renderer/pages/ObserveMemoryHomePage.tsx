import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Box, Button, Card, Group, Stack, Text } from '@mantine/core'

import { listObservations } from '../api'
import { listenDataChanged } from '../syncSignals'
import { today } from '../utils/date'

// 观察日志首页（React 版 ObserveMemoryHome.vue，R-04 记忆三栏之一）：
// 只承载"当天观察"相关内容，导航直达（go observation-list / goChat）。

const OBSERVATION_TYPE_LABELS: Record<string, string> = {
  event: '生活事件',
  fact: '事实片段',
  emotion: '情绪变化',
  preference: '偏好线索',
  misc: '小事记录',
}

interface ObservationItem {
  id?: string
  type?: string
  date?: string
  title?: string
  content?: string
  [key: string]: unknown
}

function truncated(text: unknown, maxLen = 80): string {
  const value = text ? String(text) : ''
  if (!value) return ''
  return value.length > maxLen ? `${value.slice(0, maxLen)}…` : value
}

function observationTypeLabel(type: unknown): string {
  return OBSERVATION_TYPE_LABELS[String(type || '')] || '小事记录'
}

function buildObservationOverview(items: ObservationItem[]): { total: number; topType: string } {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = String(item?.type || 'misc')
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const topType = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
  return { total: items.length, topType }
}

export default function ObserveMemoryHomePage() {
  const navigate = useNavigate()
  const [recentObservations, setRecentObservations] = useState<ObservationItem[]>([])
  const [loadingObservations, setLoadingObservations] = useState(false)
  const [observationOverview, setObservationOverview] = useState({ total: 0, topType: '' })

  const refreshObservations = useCallback(async (): Promise<void> => {
    setLoadingObservations(true)
    try {
      const data = (await listObservations({ date: today(), limit: 4 })) as {
        observations?: ObservationItem[]
      }
      const items = data?.observations || []
      setRecentObservations(items)
      setObservationOverview(buildObservationOverview(items))
    } catch {
      setRecentObservations([])
      setObservationOverview({ total: 0, topType: '' })
    } finally {
      setLoadingObservations(false)
    }
  }, [])

  useEffect(() => {
    void refreshObservations()
    const stopListening = listenDataChanged((detail) => {
      if ((detail as { observation?: boolean })?.observation) void refreshObservations()
    })
    return () => {
      stopListening()
    }
  }, [refreshObservations])

  return (
    <Stack gap={12} h="100%" style={{ overflowY: 'auto', paddingRight: 4 }}>
      {/* 头部 */}
      <Card p="14px 20px" withBorder={false}>
        <Group justify="space-between" gap={12}>
          <Text fz="var(--text-xl)" fw={800}>
            观察日志
          </Text>
          <Group gap={8}>
            <Button variant="subtle" onClick={() => navigate('/chat')}>
              去聊天
            </Button>
            <Button onClick={() => navigate('/observe/list')}>记一件小事</Button>
          </Group>
        </Group>
      </Card>

      {/* 当天观察 */}
      <Card p="12px 20px" withBorder={false}>
        <Group justify="space-between" gap={10}>
          <Group gap={8}>
            <Text fw={700} fz="var(--text-md)">
              最近的观察记录
            </Text>
            <Badge variant="light" color="gray">
              {observationOverview.total} 条
            </Badge>
          </Group>
          <Button variant="subtle" onClick={() => navigate('/observe/list')}>
            看全部观察
          </Button>
        </Group>

        {loadingObservations ? (
          <Text ta="center" c="dimmed" p={16} fz="var(--text-base)">
            加载中…
          </Text>
        ) : recentObservations.length === 0 ? (
          <Text ta="center" c="dimmed" p={40}>
            今天还没有观察记录
          </Text>
        ) : (
          <Box mt={10} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {/* 概览行 */}
            <Group grow gap={8} style={{ gridColumn: '1 / -1' }}>
              {[
                { value: String(observationOverview.total), label: '今日观察' },
                { value: observationTypeLabel(observationOverview.topType), label: '最多类型' },
              ].map((item) => (
                <Box
                  key={item.label}
                  p="10px 12px"
                  style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}
                >
                  <Text fz="var(--text-xl)" fw={800}>
                    {item.value}
                  </Text>
                  <Text fz="var(--text-xs)" c="dimmed" mt={2}>
                    {item.label}
                  </Text>
                </Box>
              ))}
            </Group>

            {recentObservations.map((item) => (
              <Box
                key={String(item.id)}
                p={12}
                onClick={() => navigate(`/observe/detail/${item.id}`)}
                style={{ cursor: 'pointer', borderRadius: 'var(--radius-md)' }}
                bg="transparent"
              >
                <Group justify="space-between" gap={4}>
                  <Text fz="var(--text-xs)" fw={600}>
                    {observationTypeLabel(item.type)}
                  </Text>
                  <Text fz="var(--text-xs)" c="dimmed">
                    {item.date}
                  </Text>
                </Group>
                <Text fw={600} fz="var(--text-base)" mt={4}>
                  {item.title}
                </Text>
                <Text fz="var(--text-sm)" c="dimmed" mt={4} lh={1.5}>
                  {truncated(item.content || '暂无内容', 96)}
                </Text>
              </Box>
            ))}
          </Box>
        )}
      </Card>
    </Stack>
  )
}
