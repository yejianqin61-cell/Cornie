import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Card, EmptyState, Grid, Stack, Text } from '@mantine/core'
import { IconCalendarOff } from '@tabler/icons-react'

import { listOnThisDay } from '../api'
import CornieDiaryMarkdown from '../components/diary/CornieDiaryMarkdown'
import { today } from '../utils/date'

// 往年今日页（React 版 OnThisDayPage.vue）：按今天日期回看往年同日的日记。

interface OtdItem {
  date?: string
  userText?: string
  cornieText?: string
  [key: string]: unknown
}

export default function OnThisDayPage() {
  const navigate = useNavigate()
  const [date] = useState(() => today())
  const [items, setItems] = useState<OtdItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      setLoading(true)
      try {
        const data = (await listOnThisDay(date, { limit: 20 })) as { items?: OtdItem[] }
        if (!cancelled) setItems(data.items || [])
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [date])

  return (
    <Stack gap={14} h="100%" style={{ overflow: 'hidden' }}>
      <Button variant="subtle" w="fit-content" onClick={() => navigate('/diary')}>
        ← 返回日记首页
      </Button>

      <Text ta="center" fz="var(--text-2xl)" fw={800}>
        往年今日
      </Text>

      {loading ? (
        <Text ta="center" c="dimmed" py={40}>
          加载中…
        </Text>
      ) : items.length === 0 ? (
        <EmptyState icon={<IconCalendarOff size={32} stroke={1.5} />} title="暂无记录" mih={240} />
      ) : (
        <Stack gap={12} style={{ flex: 1, overflowY: 'auto', paddingRight: 2, minHeight: 0 }}>
          {items.map((it) => (
            <Card key={String(it.date)} p={16} withBorder>
              <Text fw={700} mb={10}>
                {it.date}
              </Text>
              <Grid gap={14}>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Text fz="var(--text-sm)" c="dimmed" mb={4}>
                    我的日记
                  </Text>
                  <Box
                    fz="var(--text-md)"
                    style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, maxHeight: 240, overflowY: 'auto' }}
                  >
                    {it.userText || '（空）'}
                  </Box>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Text fz="var(--text-sm)" c="dimmed" mb={4}>
                    Cornie 日记
                  </Text>
                  {it.cornieText ? (
                    <Box fz="var(--text-md)" style={{ maxHeight: 240, overflowY: 'auto', color: 'brand.8' }}>
                      <CornieDiaryMarkdown content={it.cornieText} />
                    </Box>
                  ) : (
                    <Text fz="var(--text-md)">（空）</Text>
                  )}
                </Grid.Col>
              </Grid>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
