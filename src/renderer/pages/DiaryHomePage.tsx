import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Card, Grid, Group, Skeleton, Stack, Text } from '@mantine/core'

import { getEntry, listOnThisDay, listObservations } from '../api'
import { today } from '../utils/date'
import CornieDiaryMarkdown from '../components/diary/CornieDiaryMarkdown'

// 日记首页（React 版 DiaryHome.vue）：今天卡片 + 双栏预览 + 当天观察联动（R-08）+ 往年今日。
// 导航（go editor / cornie-review / on-this-day、go-observe）改为页面内 useNavigate 直达。

interface DiaryEntryData {
  userText?: string
  cornieText?: string
  [key: string]: unknown
}

interface ObservationItem {
  id?: string
  title?: string
  content?: string
  [key: string]: unknown
}

interface OtdItem {
  date?: string
  userText?: string
  cornieText?: string
  [key: string]: unknown
}

export default function DiaryHomePage() {
  const navigate = useNavigate()
  const todayStr = useMemo(() => today(), [])

  const [entry, setEntry] = useState<DiaryEntryData>({ userText: '', cornieText: '' })
  const [onThisDayItems, setOnThisDayItems] = useState<OtdItem[]>([])
  const [todayObservations, setTodayObservations] = useState<ObservationItem[]>([])
  const [loadingOtd, setLoadingOtd] = useState(false)

  const hasWritten = Boolean(entry.userText?.trim().length)
  const hasCornieWritten = Boolean(entry.cornieText?.trim().length)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        const data = (await getEntry(todayStr)) as { entry?: DiaryEntryData }
        if (!cancelled && data.entry) setEntry(data.entry)
      } catch {
        /* ignore */
      }

      setLoadingOtd(true)
      try {
        const data = (await listOnThisDay(todayStr, { limit: 10 })) as { items?: OtdItem[] }
        if (!cancelled) setOnThisDayItems(data.items || [])
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingOtd(false)
      }

      // R-08：当天观察联动
      try {
        const data = (await listObservations({ date: todayStr, limit: 3 })) as {
          observations?: ObservationItem[]
        }
        if (!cancelled) setTodayObservations(data?.observations || [])
      } catch {
        /* ignore */
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [todayStr])

  return (
    <Stack gap={14} h="100%" style={{ overflowY: 'auto', paddingRight: 4 }}>
      {/* 今天卡片 */}
      <Card p={24} bg="var(--color-tint-diary)" withBorder={false} style={{ textAlign: 'center' }}>
        <Stack align="center" gap={10}>
          <Text fz="var(--text-2xl)" fw={800}>
            {todayStr}
          </Text>
          <Group gap={12} fz="var(--text-base)" c="dimmed">
            {!hasWritten && !hasCornieWritten ? <span>还没有任何记录</span> : null}
            {hasWritten ? <span>✏️ 你写了一点</span> : null}
            {hasCornieWritten ? <span>🌸 铃湾也写了一篇</span> : null}
          </Group>
          <Group gap={10} mt={6}>
            <Button onClick={() => navigate('/diary/editor')}>写日记</Button>
            <Button variant="outline" onClick={() => navigate('/diary/cornie-review')}>
              查看铃湾日记
            </Button>
          </Group>
        </Stack>
      </Card>

      {/* 双栏日记预览 */}
      <Grid gap={12}>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card p="16px 18px" h="100%" withBorder style={{ opacity: hasWritten ? 1 : 0.65 }}>
            <Stack gap={8}>
              <Text fw={700} fz="var(--text-md)">
                ✏️ 我今天写的
              </Text>
              {hasWritten ? (
                <Text
                  fz="var(--text-base)"
                  style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 160, overflowY: 'auto' }}
                >
                  {entry.userText}
                </Text>
              ) : (
                <Text fz="var(--text-base)" c="dimmed">
                  还没写
                </Text>
              )}
            </Stack>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card
            p="16px 18px"
            h="100%"
            withBorder
            style={{
              opacity: hasCornieWritten ? 1 : 0.65,
              background: hasCornieWritten ? undefined : 'var(--color-surface-2)',
            }}
          >
            <Stack gap={8}>
              <Text fw={700} fz="var(--text-md)">
                🌸 铃湾今天写的
              </Text>
              {hasCornieWritten ? (
                <Box fz="var(--text-base)" style={{ maxHeight: 160, overflowY: 'auto' }}>
                  <CornieDiaryMarkdown content={entry.cornieText || ''} />
                </Box>
              ) : (
                <Text fz="var(--text-base)" c="dimmed">
                  铃湾还没写今天的日记。
                </Text>
              )}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* R-08：当天观察联动 */}
      <Card p="16px 20px" withBorder>
        <Group justify="space-between" mb={12}>
          <Text fw={700}>今天的观察</Text>
          <Button variant="subtle" size="compact-sm" onClick={() => navigate('/observe')}>
            看全部观察
          </Button>
        </Group>
        {todayObservations.length === 0 ? (
          <Text fz="var(--text-base)" c="dimmed">
            今天还没有观察。
          </Text>
        ) : (
          <Stack gap={8}>
            {todayObservations.slice(0, 3).map((item) => (
              <Stack key={String(item.id)} gap={2} py={10}>
                <Text fw={600} fz="var(--text-base)">
                  {item.title}
                </Text>
                <Text fz="var(--text-sm)" c="dimmed">
                  {(item.content || '').slice(0, 50)}
                </Text>
              </Stack>
            ))}
          </Stack>
        )}
      </Card>

      {/* 往年今日 */}
      <Card p="16px 20px" withBorder>
        <Group justify="space-between" mb={12}>
          <Text fw={700}>往年今日</Text>
          <Button variant="subtle" size="compact-sm" onClick={() => navigate('/diary/on-this-day')}>
            查看全部
          </Button>
        </Group>
        {loadingOtd ? (
          <Stack gap={8}>
            <Skeleton height={14} />
            <Skeleton height={14} width="70%" />
          </Stack>
        ) : onThisDayItems.length === 0 ? (
          <Text fz="var(--text-base)" c="dimmed" py={8}>
            暂无记录
          </Text>
        ) : (
          <Stack gap={8}>
            {onThisDayItems.slice(0, 3).map((it) => (
              <Stack key={String(it.date)} gap={4} py={10}>
                <Text fw={700} fz="var(--text-base)">
                  {it.date}
                </Text>
                <Text fz="var(--text-base)" c="dimmed">
                  {(it.userText || it.cornieText || '').slice(0, 60)}…
                </Text>
              </Stack>
            ))}
          </Stack>
        )}
      </Card>
    </Stack>
  )
}
