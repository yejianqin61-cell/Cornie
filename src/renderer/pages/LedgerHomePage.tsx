import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DonutChart, LineChart } from '@mantine/charts'
import { Alert, Box, Button, Card, Group, NumberInput, Paper, Select, Stack, Text, TextInput } from '@mantine/core'
import { DateInput } from '@mantine/dates'

import {
  createExpenseCategory,
  createExpenseEntry,
  createIncomeCategory,
  createIncomeEntry,
  listLedgerEntries,
  listLedgerCategories,
} from '../api'
import { listenDataChanged } from '../syncSignals'
import { useRequestGuard } from '../hooks/useRequestGuard'
import { formatDate, parseLocalDate, today } from '../utils/date'
import LedgerCalendar, { type LedgerCalendarCell } from '../components/ledger/LedgerCalendar'

// 收支首页（React 版 LedgerHome.vue）。
// 重写决策（对照盘点规格 03）：
// - 时区语义统一为本地时区：日期键一律走 utils/date（旧版 toTimeMs 把 'YYYY-MM-DD'
//   按 UTC 零点解析做月边界，与日历/聚合的本地日期键错位一天）；
// - 金额输入收口 NumberInput(decimalScale=2, min=0)；
// - refresh 接竞态守卫（快速换月旧响应不再覆盖新月数据）；
// - 月历与两张图表改用 Mantine 官方组件（Month / DonutChart / LineChart）。

interface LedgerEntry {
  id?: string | number
  type?: string
  amount?: number
  occurredAt?: string
  categoryName?: string
  categoryId?: string
  item?: string
  [key: string]: unknown
}

interface LedgerCategory {
  id?: string | number
  name?: string
  type?: string
  [key: string]: unknown
}

const CHART_COLORS = [
  'var(--color-accent)',
  'var(--color-warning)',
  'var(--color-success)',
  'var(--color-chart-sage)',
  'var(--color-chart-sand)',
  'var(--color-danger)',
]

function toTimeMs(value: unknown, { endOfDay = false }: { endOfDay?: boolean } = {}): number {
  if (value === null || value === undefined || value === '') return Number.NaN
  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const d = parseLocalDate(text)
    if (!d) return Number.NaN
    return endOfDay ? d.getTime() + 24 * 3600 * 1000 - 1 : d.getTime()
  }
  const ms = new Date(text).getTime()
  return Number.isNaN(ms) ? Number.NaN : ms
}

function toDateKey(value: unknown): string {
  const d = parseLocalDate(String(value ?? '').slice(0, 10))
  if (d) return formatDate(d)
  const ms = new Date(String(value ?? '')).getTime()
  return Number.isNaN(ms) ? '' : formatDate(new Date(ms))
}

export default function LedgerHomePage() {
  const ledgerGuard = useRequestGuard()

  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [categories, setCategories] = useState<LedgerCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showQuickCategoryCreate, setShowQuickCategoryCreate] = useState(false)
  const [showAllEntries, setShowAllEntries] = useState(false)
  const [form, setForm] = useState({
    amount: '',
    type: 'expense',
    categoryId: '',
    categoryName: '',
    item: '',
    occurredAt: today(),
  })
  const [saving, setSaving] = useState(false)
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [categoryCreateError, setCategoryCreateError] = useState('')
  const [draftCategoryName, setDraftCategoryName] = useState('')
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [monthlyExpense, setMonthlyExpense] = useState(0)

  const todayDateKey = useMemo(() => formatDate(new Date()), [])
  const categoriesRef = useRef(categories)
  categoriesRef.current = categories
  const currentMonthRef = useRef(currentMonth)
  currentMonthRef.current = currentMonth

  const refresh = useCallback(async (): Promise<void> => {
    const { token } = ledgerGuard.begin('refresh')
    setLoading(true)
    try {
      const [entryData, catData] = await Promise.all([listLedgerEntries({}), listLedgerCategories({})])
      if (!ledgerGuard.isCurrent('refresh', token)) return
      const entryItems = ((entryData as { items?: LedgerEntry[] })?.items || []) as LedgerEntry[]
      setEntries(entryItems)
      setCategories(((catData as { items?: LedgerCategory[] })?.items || []) as LedgerCategory[])

      // 本地时区月界：月首零点 ~ 月末 23:59:59.999
      const now = currentMonthRef.current
      const fromMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      const toMs = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime()
      let inc = 0
      let exp = 0
      for (const entry of entryItems) {
        const occurredAtMs = toTimeMs(entry.occurredAt, { endOfDay: true })
        if (!Number.isFinite(occurredAtMs) || occurredAtMs < fromMs || occurredAtMs > toMs) continue
        if (entry.type === 'income') inc += entry.amount || 0
        else exp += entry.amount || 0
      }
      if (!ledgerGuard.isCurrent('refresh', token)) return
      setMonthlyIncome(inc)
      setMonthlyExpense(exp)
    } catch {
      // ignore refresh failure
    } finally {
      if (ledgerGuard.isCurrent('refresh', token)) {
        setLoading(false)
        ledgerGuard.end('refresh', token)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void refresh()
    const stopListening = listenDataChanged((detail) => {
      if ((detail as { ledger?: boolean })?.ledger) void refresh()
    })
    return () => {
      stopListening()
    }
  }, [refresh])

  // ── 派生数据 ──
  const monthEntries = useMemo(() => {
    const now = currentMonth
    const fromMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const toMs = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime()
    return entries.filter((entry) => {
      const occurredAtMs = toTimeMs(entry.occurredAt, { endOfDay: true })
      return Number.isFinite(occurredAtMs) && occurredAtMs >= fromMs && occurredAtMs <= toMs
    })
  }, [entries, currentMonth])

  const visibleEntries = useMemo(() => {
    let items = monthEntries
    if (selectedDate) {
      items = items.filter((entry) => toDateKey(entry.occurredAt) === selectedDate)
    }
    if (typeFilter) {
      items = items.filter((entry) => entry.type === typeFilter)
    }
    return [...items].sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
  }, [monthEntries, selectedDate, typeFilter])

  const currentFilterLabel = `${selectedDate ? `${selectedDate} 这一天` : '这个月'}的记录，${
    typeFilter === 'income' ? '只看收入' : typeFilter === 'expense' ? '只看支出' : '收支都看'
  }`

  const summaryByDay = useMemo(() => {
    const grouped = new Map<string, { expense: number; income: number }>()
    for (const entry of monthEntries) {
      const key = toDateKey(entry.occurredAt)
      if (!key) continue
      const current = grouped.get(key) || { expense: 0, income: 0 }
      if (entry.type === 'income') current.income += entry.amount || 0
      if (entry.type === 'expense') current.expense += entry.amount || 0
      grouped.set(key, current)
    }
    return grouped
  }, [monthEntries])

  const calendarCells = useMemo<LedgerCalendarCell[]>(() => {
    const cells: LedgerCalendarCell[] = []
    const month = currentMonth.getMonth()
    for (const [key, value] of summaryByDay) {
      const d = parseLocalDate(key)
      if (!d) continue
      cells.push({
        date: key,
        day: d.getDate(),
        inMonth: d.getMonth() === month,
        expense: value.expense,
        income: value.income,
      })
    }
    return cells
  }, [summaryByDay, currentMonth])

  const dailyTrendPoints = useMemo(() => {
    return [...summaryByDay.entries()]
      .map(([date, value]) => ({ date, income: value.income, expense: value.expense }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [summaryByDay])

  const categoryDistribution = useMemo(() => {
    const grouped = new Map<string, number>()
    for (const entry of monthEntries.filter((item) => item.type === 'expense')) {
      const key = entry.categoryName || '未分类'
      grouped.set(key, (grouped.get(key) || 0) + (entry.amount || 0))
    }
    const total = [...grouped.values()].reduce((sum, value) => sum + value, 0)
    return [...grouped.entries()]
      .map(([name, amount], index) => ({
        name,
        amount,
        ratio: total > 0 ? amount / total : 0,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [monthEntries])

  const filteredCategories = useMemo(
    () => categories.filter((item) => item.type === form.type),
    [categories, form.type]
  )

  // 类型切换时清掉不匹配的类目（与旧版 watch 行为一致）
  useEffect(() => {
    const currentCategory = categories.find((item) => item.id === form.categoryId)
    if (currentCategory && currentCategory.type !== form.type) {
      setForm((prev) => ({ ...prev, categoryId: '', categoryName: '' }))
    }
    if (showQuickCategoryCreate) {
      setCategoryCreateError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type])

  // 类目列表变化后校准选中类目名（与旧版 watch(filteredCategories) 一致）
  useEffect(() => {
    if (!form.categoryId) return
    const matched = filteredCategories.find((item) => item.id === form.categoryId)
    if (matched) {
      setForm((prev) => (prev.categoryName === matched.name ? prev : { ...prev, categoryName: String(matched.name) }))
      return
    }
    setForm((prev) => ({ ...prev, categoryId: '', categoryName: '' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCategories])

  // ── 动作 ──
  const openQuickCategoryCreate = () => {
    setDraftCategoryName('')
    setCategoryCreateError('')
    setShowQuickCategoryCreate(true)
  }

  const closeQuickCategoryCreate = () => {
    setDraftCategoryName('')
    setCategoryCreateError('')
    setShowQuickCategoryCreate(false)
  }

  const submitQuickCategoryCreate = async (): Promise<void> => {
    const name = draftCategoryName.trim()
    if (!name) {
      setCategoryCreateError('先给这个类目起个名字吧。')
      return
    }

    setCreatingCategory(true)
    setCategoryCreateError('')

    try {
      const createCategory = form.type === 'income' ? createIncomeCategory : createExpenseCategory
      const result = (await createCategory({ name })) as { category?: LedgerCategory } | null
      await refresh()

      const createdCategory =
        result?.category ?? categoriesRef.current.find((item) => item.name === name && item.type === form.type) ?? null

      if (createdCategory) {
        setForm((prev) => ({
          ...prev,
          categoryId: String(createdCategory.id ?? ''),
          categoryName: String(createdCategory.name ?? ''),
        }))
      }

      closeQuickCategoryCreate()
    } catch (error) {
      const message = String((error as { message?: string })?.message || '')
      setCategoryCreateError(
        message.includes('invalid category name')
          ? '类目名不合适，换一个吧'
          : message.includes('similar') || message.includes('duplicate')
            ? '类目已存在或太接近'
            : '创建失败，请稍后再试'
      )
    } finally {
      setCreatingCategory(false)
    }
  }

  const submitEntry = async (): Promise<void> => {
    setSaving(true)
    setErrorMsg('')
    try {
      let categoryName = form.categoryName
      if (form.categoryId) {
        const cat = categories.find((c) => String(c.id) === String(form.categoryId))
        if (cat) categoryName = String(cat.name)
      }
      const fn = form.type === 'income' ? createIncomeEntry : createExpenseEntry
      await fn({
        amount: Number(form.amount),
        occurredAt: form.occurredAt,
        categoryId: form.categoryId || null,
        categoryName: categoryName || null,
        item: form.item || null,
      })
      setForm({
        amount: '',
        type: 'expense',
        categoryId: '',
        categoryName: '',
        item: '',
        occurredAt: today(),
      })
      setShowForm(false)
      await refresh()
    } catch (e) {
      setErrorMsg((e as { message?: string })?.message || '记账失败')
    } finally {
      setSaving(false)
    }
  }

  const selectCalendarDate = (date: string) => {
    setSelectedDate((prev) => (prev === date ? '' : date))
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

  const clearFilters = () => {
    setSelectedDate('')
    setTypeFilter('')
  }

  const lineChartData = dailyTrendPoints.map((point) => ({
    date: point.date.slice(5),
    支出: Number(point.expense.toFixed(2)),
    收入: Number(point.income.toFixed(2)),
  }))

  return (
    <Stack gap={14} h="100%" style={{ overflowY: 'auto', paddingRight: 4 }}>
      {/* 月度概览 */}
      <Card p="16px 20px" bg="var(--color-tint-ledger)" withBorder={false}>
        <Text fw={700} fz="var(--text-md)" c="dimmed" mb={8}>
          这个月的收支概览
        </Text>
        <Group grow gap={0}>
          {[
            { label: '收入', value: `+¥${monthlyIncome.toFixed(2)}`, color: 'var(--color-success)' },
            { label: '支出', value: `-¥${monthlyExpense.toFixed(2)}`, color: 'var(--color-danger)' },
            { label: '结余', value: `¥${(monthlyIncome - monthlyExpense).toFixed(2)}`, color: undefined },
          ].map((item, index) => (
            <Box
              key={item.label}
              ta="center"
              py={4}
              style={{ borderRight: index < 2 ? '1px solid var(--color-border)' : undefined }}
            >
              <Text component="span" fz="var(--text-xs)" c="dimmed" style={{ display: 'block', marginBottom: 4 }}>
                {item.label}
              </Text>
              <Text fz="var(--text-2xl)" fw={700} style={{ fontVariantNumeric: 'tabular-nums', color: item.color }}>
                {item.value}
              </Text>
            </Box>
          ))}
        </Group>
      </Card>

      {/* 月历（Mantine Month 底座） */}
      <LedgerCalendar
        month={currentMonth}
        cells={calendarCells}
        summaryByDay={summaryByDay}
        selectedDate={selectedDate}
        todayDate={todayDateKey}
        onPrevMonth={() => void moveMonth(-1)}
        onNextMonth={() => void moveMonth(1)}
        onSelectDate={selectCalendarDate}
      />

      {/* 筛选条 */}
      <Card p="12px 16px" withBorder={false}>
        <Group justify="space-between" gap={8} wrap="wrap">
          <Text fz="var(--text-base)">{currentFilterLabel}</Text>
          <Group gap={8}>
            <Select
              w={140}
              size="sm"
              allowDeselect={false}
              data={[
                { value: '', label: '收支都看' },
                { value: 'expense', label: '只看支出' },
                { value: 'income', label: '只看收入' },
              ]}
              value={typeFilter}
              onChange={(value) => setTypeFilter(value || '')}
            />
            <Button variant="subtle" onClick={() => void jumpToToday()}>
              回到今天
            </Button>
            <Button variant="subtle" onClick={clearFilters}>
              清除筛选
            </Button>
          </Group>
        </Group>
      </Card>

      {/* 图表区 */}
      <Group align="stretch" gap={14} grow wrap="wrap">
        <Card p={16} withBorder style={{ flex: '1 1 320px' }}>
          <Text fw={700} mb={10}>
            钱主要花在了哪里
          </Text>
          {categoryDistribution.length === 0 ? (
            <Text c="dimmed" fz="var(--text-base)" py={20} ta="center">
              这个月还没有支出记录。
            </Text>
          ) : (
            <Group align="center" gap={16} wrap="nowrap">
              <DonutChart
                size={140}
                thickness={20}
                data={categoryDistribution.map((item) => ({
                  name: item.name,
                  value: Number(item.amount.toFixed(2)),
                  color: item.color,
                }))}
                strokeWidth={0}
              />
              <Stack gap={6}>
                {categoryDistribution.map((segment) => (
                  <Group key={segment.name} gap={8} wrap="nowrap">
                    <Box w={10} h={10} style={{ borderRadius: 2, background: segment.color, flex: '0 0 auto' }} />
                    <Text fz="var(--text-sm)" truncate>
                      {segment.name}
                    </Text>
                    <Text fz="var(--text-sm)" c="dimmed" ml="auto">
                      ¥{segment.amount.toFixed(2)}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Group>
          )}
        </Card>

        <Card p={16} withBorder style={{ flex: '1 1 360px' }}>
          <Group justify="space-between" mb={10}>
            <Text fw={700}>这几天的收支走势</Text>
            <Text fz="var(--text-xs)" c="dimmed">
              支出 / 收入
            </Text>
          </Group>
          {dailyTrendPoints.length === 0 ? (
            <Text c="dimmed" fz="var(--text-base)" py={20} ta="center">
              这个月还没有记录，所以暂时看不到走势。
            </Text>
          ) : dailyTrendPoints.length < 2 ? (
            <Text c="dimmed" fz="var(--text-base)" py={20} ta="center">
              只有一天记录，暂无趋势
            </Text>
          ) : (
            <>
              <LineChart
                h={164}
                data={lineChartData}
                dataKey="date"
                withLegend
                legendProps={{ verticalAlign: 'bottom', height: 28 }}
                series={[
                  { name: '支出', color: 'var(--color-danger)' },
                  { name: '收入', color: 'var(--color-success)' },
                ]}
                curveType="linear"
                valueFormatter={(value) => `¥${Number(value).toFixed(2)}`}
                withDots
                dotProps={{ r: 3.5 }}
              />
              <Text fz="var(--text-xs)" c="dimmed" mt={6}>
                本月最高单日波动：¥
                {Math.max(...dailyTrendPoints.map((p) => Math.max(p.expense, p.income)), 0).toFixed(2)}
              </Text>
            </>
          )}
        </Card>
      </Group>

      {/* 记一笔 */}
      <Card p={16} withBorder={false}>
        <Group justify="space-between" mb={showForm ? 12 : 0}>
          <Text fw={700}>记一笔</Text>
          <Button onClick={() => setShowForm((prev) => !prev)}>{showForm ? '收起' : '记一笔'}</Button>
        </Group>

        {showForm ? (
          <Stack gap={10}>
            <Group grow wrap="nowrap">
              <NumberInput
                placeholder="金额"
                decimalScale={2}
                min={0}
                thousandSeparator=","
                value={form.amount === '' ? undefined : Number(form.amount)}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    amount: value === undefined || value === null ? '' : String(value),
                  }))
                }
              />
              <Select
                allowDeselect={false}
                data={[
                  { value: 'expense', label: '支出' },
                  { value: 'income', label: '收入' },
                ]}
                value={form.type}
                onChange={(value) => setForm((prev) => ({ ...prev, type: value || 'expense' }))}
              />
            </Group>
            <TextInput
              placeholder="这笔钱是做什么的"
              value={form.item}
              onChange={(e) => {
                const { value } = e.currentTarget
                setForm((prev) => ({ ...prev, item: value }))
              }}
            />
            <DateInput
              valueFormat="YYYY-MM-DD"
              placeholder="发生日期"
              value={form.occurredAt || undefined}
              onChange={(value) => setForm((prev) => ({ ...prev, occurredAt: value ? String(value) : '' }))}
            />
            <Group gap={8} wrap="nowrap">
              <Select
                flex={1}
                data={[
                  { value: '', label: '选择类目' },
                  ...filteredCategories.map((c) => ({ value: String(c.id), label: String(c.name) })),
                ]}
                value={form.categoryId || ''}
                onChange={(value) => {
                  const id = value || ''
                  const matched = filteredCategories.find((c) => String(c.id) === id)
                  setForm((prev) => ({
                    ...prev,
                    categoryId: id,
                    categoryName: matched ? String(matched.name) : '',
                  }))
                }}
                allowDeselect={false}
              />
              <Button variant="subtle" onClick={openQuickCategoryCreate}>
                新建类目
              </Button>
            </Group>

            {showQuickCategoryCreate ? (
              <Paper p={12} radius="md" bg="var(--color-surface-2)">
                <Stack gap={8}>
                  <Text fw={700} fz="var(--text-sm)">
                    新建类目
                  </Text>
                  <Group gap={8} wrap="nowrap">
                    <TextInput
                      flex={1}
                      placeholder="比如：游戏充值、学习资料"
                      value={draftCategoryName}
                      onChange={(e) => setDraftCategoryName(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void submitQuickCategoryCreate()
                        }
                      }}
                    />
                    <Button
                      disabled={creatingCategory || !draftCategoryName.trim()}
                      onClick={() => void submitQuickCategoryCreate()}
                    >
                      {creatingCategory ? '创建中…' : '创建并选中'}
                    </Button>
                    <Button variant="subtle" disabled={creatingCategory} onClick={closeQuickCategoryCreate}>
                      取消
                    </Button>
                  </Group>
                  {categoryCreateError ? (
                    <Text c="danger.5" fz="var(--text-sm)">
                      {categoryCreateError}
                    </Text>
                  ) : null}
                </Stack>
              </Paper>
            ) : null}

            <Button disabled={saving || !form.amount} onClick={() => void submitEntry()} w="fit-content">
              {saving ? '保存中…' : '保存'}
            </Button>
            {errorMsg ? (
              <Alert color="danger" variant="light">
                {errorMsg}
              </Alert>
            ) : null}
          </Stack>
        ) : null}
      </Card>

      {/* 记录列表 */}
      <Card p={16} withBorder={false}>
        <Group justify="space-between" mb={12}>
          <Text fw={700}>{selectedDate ? '这一天的记录' : '这个月的记录'}</Text>
          <Button variant="subtle" onClick={() => setShowAllEntries((prev) => !prev)}>
            {showAllEntries ? '收起' : '查看全部'}
          </Button>
        </Group>
        {visibleEntries.length === 0 ? (
          <Text c="dimmed" fz="var(--text-base)">
            当前筛选下还没有记录。
          </Text>
        ) : (
          <Stack gap={6}>
            {(showAllEntries ? visibleEntries : visibleEntries.slice(0, 8)).map((e) => {
              const income = e.type === 'income'
              return (
                <Group
                  key={String(e.id)}
                  justify="space-between"
                  gap={10}
                  px={12}
                  py={8}
                  wrap="nowrap"
                  style={{
                    borderRadius: 'var(--radius-md)',
                    background: income ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
                  }}
                >
                  <Text fz="var(--text-xs)" c="dimmed" style={{ flex: '0 0 auto' }}>
                    {income ? '收入' : '支出'}
                  </Text>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fz="var(--text-base)" truncate>
                      {e.item || e.categoryName || '未分类'}
                    </Text>
                    <Text fz="var(--text-xs)" c="dimmed">
                      {toDateKey(e.occurredAt)}
                      {e.categoryName ? ` · ${e.categoryName}` : ''}
                    </Text>
                  </Box>
                  <Text
                    fz="var(--text-base)"
                    fw={700}
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      color: income ? 'var(--color-success)' : 'var(--color-danger)',
                    }}
                  >
                    {income ? '+' : '-'}¥{(e.amount ?? 0).toFixed(2)}
                  </Text>
                </Group>
              )
            })}
          </Stack>
        )}
      </Card>

      <Card p="12px 16px" withBorder={false}>
        <Button variant="outline" onClick={() => setShowForm(true)}>
          管理收支类目 →
        </Button>
      </Card>

      {loading ? (
        <Text ta="center" fz="var(--text-xs)" c="dimmed">
          加载中…
        </Text>
      ) : null}
    </Stack>
  )
}
