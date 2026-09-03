import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MonthPickerInput } from '@mantine/dates'
import { Alert, Badge, Box, Button, Card, Group, Modal, Stack, Text, Textarea, UnstyledButton } from '@mantine/core'

import { getEntry, listEntries, listOnThisDay, regenerateCornie, upsertEntry } from '../api'
import { useRequestGuard } from '../hooks/useRequestGuard'
import { today } from '../utils/date'

// 日记编辑页（React 版 DiaryEditor.vue）。
// FE-05：切换日期时旧响应不得覆盖新日期内容——本版为 entry / OTD / 列表全部接竞态守卫；
// 并修复两个旧版数据丢失缺陷：
// 1) regenCornie 成功后仅替换 cornieText，未保存的 userText 编辑不再被服务端响应整体覆盖；
// 2) 切换日期时若有未保存更改，先弹确认再切换（草稿丢失守门）。

interface DiaryEntryData {
  userText?: string
  cornieText?: string
  [key: string]: unknown
}

interface MonthEntry {
  date?: string
  hasUserText?: boolean
  hasCornieText?: boolean
  [key: string]: unknown
}

interface OtdItem {
  date?: string
  userText?: string
  cornieText?: string
  [key: string]: unknown
}

export default function DiaryEditorPage() {
  const navigate = useNavigate()
  const editorGuard = useRequestGuard()

  const [selectedDate, setSelectedDate] = useState(today())
  const [selectedMonth, setSelectedMonth] = useState(() => today().slice(0, 7))

  const [entries, setEntries] = useState<MonthEntry[]>([])
  const [entry, setEntry] = useState<DiaryEntryData>({ userText: '', cornieText: '' })
  const [onThisDayItems, setOnThisDayItems] = useState<OtdItem[]>([])
  const [otdError, setOtdError] = useState('')
  const [loadingList, setLoadingList] = useState(false)
  const [loadingEntry, setLoadingEntry] = useState(false)
  const [loadingOtd, setLoadingOtd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [dirty, setDirty] = useState(false)

  // 脏切换确认
  const [pendingDate, setPendingDate] = useState<string | null>(null)

  const refreshList = useCallback(async (): Promise<void> => {
    const { token } = editorGuard.begin('list')
    setLoadingList(true)
    setErrorMsg('')
    try {
      const data = (await listEntries({ month: selectedMonth })) as {
        entries?: MonthEntry[]
      }
      if (!editorGuard.isCurrent('list', token)) return
      setEntries(data.entries || [])
    } catch (e) {
      if (!editorGuard.isCurrent('list', token)) return
      setErrorMsg((e as { message?: string })?.message || String(e))
    } finally {
      if (editorGuard.isCurrent('list', token)) {
        setLoadingList(false)
        editorGuard.end('list', token)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  const loadEntry = useCallback(
    async (date: string): Promise<void> => {
      const { token, signal } = editorGuard.begin('entry')
      setLoadingEntry(true)
      setErrorMsg('')
      try {
        const data = (await getEntry(date, { signal })) as { entry?: DiaryEntryData }
        if (!editorGuard.isCurrent('entry', token)) return
        setEntry(data.entry || { userText: '', cornieText: '' })
        setDirty(false)
      } catch (e) {
        if (!editorGuard.isCurrent('entry', token)) return
        setErrorMsg((e as { message?: string })?.message || String(e))
      } finally {
        if (editorGuard.isCurrent('entry', token)) {
          setLoadingEntry(false)
          editorGuard.end('entry', token)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const loadOnThisDay = useCallback(
    async (date: string): Promise<void> => {
      const { token, signal } = editorGuard.begin('otd')
      setLoadingOtd(true)
      setOtdError('')
      try {
        const data = (await listOnThisDay(date, { limit: 10, ...(signal ? { signal } : {}) })) as {
          items?: OtdItem[]
        }
        if (!editorGuard.isCurrent('otd', token)) return
        setOnThisDayItems(data.items || [])
      } catch (e) {
        if (!editorGuard.isCurrent('otd', token)) return
        // 旧版用 __error 哨兵混入 items；React 版用独立错误态
        setOtdError((e as { message?: string })?.message || String(e))
        setOnThisDayItems([])
      } finally {
        if (editorGuard.isCurrent('otd', token)) {
          setLoadingOtd(false)
          editorGuard.end('otd', token)
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const save = useCallback(async (): Promise<void> => {
    setSaving(true)
    setErrorMsg('')
    try {
      const data = (await upsertEntry(selectedDate, {
        userText: entry.userText,
        cornieText: entry.cornieText,
      })) as { entry?: DiaryEntryData }
      setEntry(data.entry || { userText: '', cornieText: '' })
      setDirty(false)
      await refreshList()
    } catch (e) {
      setErrorMsg((e as { message?: string })?.message || String(e))
    } finally {
      setSaving(false)
    }
  }, [selectedDate, entry, refreshList])

  const regenCornie = useCallback(async (): Promise<void> => {
    setRegenerating(true)
    setErrorMsg('')
    try {
      const data = (await regenerateCornie(selectedDate)) as { entry?: DiaryEntryData }
      // 修复旧版缺陷：保留本地未保存的 userText 编辑，仅采用服务端生成的 cornieText
      setEntry((prev) => ({
        ...(data.entry || {}),
        userText: prev.userText,
      }))
      await refreshList()
    } catch (e) {
      setErrorMsg((e as { message?: string })?.message || String(e))
    } finally {
      setRegenerating(false)
    }
  }, [selectedDate, refreshList])

  const pickDate = (date: string) => {
    if (date === selectedDate) return
    if (dirty) {
      setPendingDate(date)
      return
    }
    setSelectedDate(date)
  }

  useEffect(() => {
    void loadEntry(selectedDate)
    void loadOnThisDay(selectedDate)
  }, [selectedDate, loadEntry, loadOnThisDay])

  useEffect(() => {
    void refreshList()
  }, [refreshList])

  return (
    <Stack gap={12} h="100%" style={{ minHeight: 0 }}>
      <Button variant="subtle" w="fit-content" onClick={() => navigate('/diary')}>
        ← 返回日记首页
      </Button>

      {/* 顶栏 */}
      <Group justify="space-between" align="flex-start" gap={12} wrap="wrap">
        <Box>
          <Text fz="var(--text-2xl)" fw={800}>
            {selectedDate}
          </Text>
          <Text fz="var(--text-sm)" c="dimmed" mt={4}>
            {loadingEntry ? '加载中…' : dirty ? '未保存更改' : '已同步'}
          </Text>
        </Box>
        <Group gap={8} wrap="wrap">
          <MonthPickerInput
            w={140}
            size="sm"
            valueFormat="YYYY-MM"
            placeholder="选择月份"
            value={selectedMonth || null}
            onChange={(value) => setSelectedMonth(value ? String(value).slice(0, 7) : '')}
            clearable
          />
          <Button variant="outline" onClick={() => pickDate(today())}>
            回到今天
          </Button>
          <Button disabled={saving || !dirty} onClick={() => void save()}>
            {saving ? '保存中…' : '保存'}
          </Button>
          <Button variant="light" disabled={regenerating} onClick={() => void regenCornie()}>
            {regenerating ? '生成中…' : '让铃湾写一篇'}
          </Button>
        </Group>
      </Group>

      {errorMsg ? (
        <Alert color="danger" variant="light">
          {errorMsg}
        </Alert>
      ) : null}

      {/* 主区 */}
      <Box style={{ flex: 1, display: 'grid', gridTemplateColumns: '230px 1fr', gap: 14, minHeight: 0 }}>
        {/* 侧边栏 */}
        <Card p={0} withBorder style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <Box p="12px 14px 8px" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <Text fw={700} fz="var(--text-md)">
              本月条目
            </Text>
            <Text fz="var(--text-xs)" c="dimmed" mt={3}>
              {loadingList ? '加载中…' : `${entries.length} 天有记录`}
            </Text>
          </Box>
          <Stack gap={4} p={8} style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {entries.map((e) => {
              const date = String(e.date || '')
              const active = date === selectedDate
              return (
                <UnstyledButton
                  key={date}
                  onClick={() => pickDate(date)}
                  px={10}
                  py={8}
                  style={{
                    borderRadius: 'var(--radius-md)',
                    background: active ? 'brand.0' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 6,
                    textAlign: 'left',
                  }}
                >
                  <Text fz="var(--text-base)">{date}</Text>
                  <Group gap={4}>
                    {e.hasUserText ? (
                      <Badge size="xs" variant="light" color="gray">
                        我的
                      </Badge>
                    ) : null}
                    {e.hasCornieText ? (
                      <Badge size="xs" variant="light" color="brand">
                        Cornie
                      </Badge>
                    ) : null}
                  </Group>
                </UnstyledButton>
              )
            })}
          </Stack>
        </Card>

        {/* 编辑区 */}
        <Stack gap={12} style={{ overflowY: 'auto', minHeight: 0, paddingRight: 2 }}>
          <Card p={16} withBorder>
            <Stack gap={10}>
              <Text fw={700} fz="var(--text-md)">
                我的日记
              </Text>
              <Textarea
                autosize
                minRows={10}
                placeholder="今天发生了什么？写一点也行。"
                value={entry.userText || ''}
                onChange={(e) => {
                  const { value } = e.currentTarget
                  setEntry((prev) => ({ ...prev, userText: value }))
                  setDirty(true)
                }}
              />
            </Stack>
          </Card>

          <Card p={16} withBorder>
            <Stack gap={10}>
              <Text fw={700} fz="var(--text-md)">
                Cornie 的日记
              </Text>
              <Textarea
                autosize
                minRows={10}
                placeholder="点击「让铃湾写一篇」生成。"
                value={entry.cornieText || ''}
                onChange={(e) => {
                  const { value } = e.currentTarget
                  setEntry((prev) => ({ ...prev, cornieText: value }))
                  setDirty(true)
                }}
              />
            </Stack>
          </Card>

          {/* 往年今日 */}
          <Card p={16} withBorder>
            <Text fw={700} fz="var(--text-md)">
              往年今日
              {loadingOtd ? (
                <Text component="span" fw={400} fz="var(--text-sm)" c="dimmed" ml={6}>
                  加载中…
                </Text>
              ) : null}
            </Text>
            {otdError ? (
              <Text c="danger.5" fz="var(--text-sm)" mt={8}>
                加载失败：{otdError}
              </Text>
            ) : null}
            {onThisDayItems.length === 0 && !loadingOtd && !otdError ? (
              <Text c="dimmed" fz="var(--text-base)" py={8}>
                暂无记录
              </Text>
            ) : (
              <Stack gap={8} mt={10}>
                {onThisDayItems.map((it, index) => (
                  <Stack key={String(it.date || index)} gap={6} py={10}>
                    <Text fw={700} fz="var(--text-base)">
                      {it.date}
                    </Text>
                    <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <Box fz="var(--text-base)">
                        <Text
                          component="span"
                          fz="var(--text-xs)"
                          c="dimmed"
                          style={{ display: 'block', marginBottom: 2 }}
                        >
                          我的
                        </Text>
                        {it.userText || '（空）'}
                      </Box>
                      <Box fz="var(--text-base)">
                        <Text
                          component="span"
                          fz="var(--text-xs)"
                          c="dimmed"
                          style={{ display: 'block', marginBottom: 2 }}
                        >
                          Cornie
                        </Text>
                        {it.cornieText || '（空）'}
                      </Box>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            )}
          </Card>
        </Stack>
      </Box>

      {/* 脏切换确认（草稿守门） */}
      <Modal opened={!!pendingDate} onClose={() => setPendingDate(null)} title="有未保存的更改" size={440}>
        <Stack gap="md">
          <Text fz="var(--text-base)" c="dimmed">
            切换日期会离开当前编辑内容，未保存的修改将丢失。要先保存吗？
          </Text>
          <Group justify="flex-end" gap={8}>
            <Button variant="subtle" onClick={() => setPendingDate(null)}>
              留在本页
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const target = pendingDate
                setPendingDate(null)
                if (target) {
                  setSelectedDate(target)
                }
              }}
            >
              放弃更改并切换
            </Button>
            <Button
              onClick={async () => {
                const target = pendingDate
                setPendingDate(null)
                await save()
                if (target) setSelectedDate(target)
              }}
            >
              保存并切换
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
