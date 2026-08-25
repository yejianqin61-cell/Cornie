<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  createExpenseCategory,
  createExpenseEntry,
  createIncomeCategory,
  createIncomeEntry,
  listLedgerEntries,
  listLedgerCategories,
} from '../api'
import { listenDataChanged } from '../syncSignals'
import { today } from '../utils/date'
import LedgerCalendar from './LedgerCalendar.vue'

const entries = ref([])
const categories = ref([])
const loading = ref(false)
const showForm = ref(false)
const showQuickCategoryCreate = ref(false)
const showAllEntries = ref(false)
const form = ref({
  amount: '',
  type: 'expense',
  categoryId: '',
  categoryName: '',
  item: '',
  occurredAt: today(),
})
const saving = ref(false)
const creatingCategory = ref(false)
const errorMsg = ref('')
const categoryCreateError = ref('')
const draftCategoryName = ref('')
const currentMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const selectedDate = ref('')
const typeFilter = ref('')

const monthlyIncome = ref(0)
const monthlyExpense = ref(0)

const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日']
const chartColors = ['#E8856A', '#E4A35E', '#5B9A6B', '#8DB5A7', '#C59E7A', '#D96A5C']
const trendChartFrame = Object.freeze({
  width: 320,
  height: 164,
  paddingLeft: 34,
  paddingRight: 16,
  paddingTop: 14,
  paddingBottom: 28,
})

function pad2(value) {
  return String(value).padStart(2, '0')
}

function formatLocalDateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

const todayDateKey = formatLocalDateKey(new Date())

function toDateKey(value) {
  return formatLocalDateKey(new Date(value))
}

function toTimeMs(value, { endOfDay = false } = {}) {
  if (!value) return Number.NaN
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'
    return new Date(`${value}${suffix}`).getTime()
  }
  return new Date(value).getTime()
}

function getMonthRange(date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    from: `${formatLocalDateKey(start)}T00:00:00.000Z`,
    to: `${formatLocalDateKey(end)}T23:59:59.999Z`,
  }
}

const monthLabel = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth() + 1
  return `${year}年${month}月`
})

const monthEntries = computed(() => {
  const range = getMonthRange(currentMonth.value)
  const fromMs = toTimeMs(range.from)
  const toMs = toTimeMs(range.to, { endOfDay: true })

  return entries.value.filter((entry) => {
    const occurredAtMs = toTimeMs(entry.occurredAt, { endOfDay: true })
    return Number.isFinite(occurredAtMs) && occurredAtMs >= fromMs && occurredAtMs <= toMs
  })
})

const visibleEntries = computed(() => {
  let items = monthEntries.value
  if (selectedDate.value) {
    items = items.filter((entry) => toDateKey(entry.occurredAt) === selectedDate.value)
  }
  if (typeFilter.value) {
    items = items.filter((entry) => entry.type === typeFilter.value)
  }
  return [...items].sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
})

const currentFilterLabel = computed(() => {
  const datePart = selectedDate.value ? `${selectedDate.value} 这一天` : '这个月'
  const typePart = typeFilter.value === 'income' ? '只看收入' : typeFilter.value === 'expense' ? '只看支出' : '收支都看'
  return `${datePart}的记录，${typePart}`
})

const dailyTrendPoints = computed(() => {
  const grouped = new Map()
  for (const entry of monthEntries.value) {
    const key = toDateKey(entry.occurredAt)
    const current = grouped.get(key) || { date: key, income: 0, expense: 0 }
    if (entry.type === 'income') current.income += entry.amount || 0
    if (entry.type === 'expense') current.expense += entry.amount || 0
    grouped.set(key, current)
  }
  return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date))
})

const trendChartStats = computed(() => {
  const values = dailyTrendPoints.value.flatMap((item) => [item.expense || 0, item.income || 0])
  const maxValue = Math.max(...values, 0)
  const safeMaxValue = maxValue > 0 ? maxValue : 1
  return {
    maxValue,
    safeMaxValue,
    midValue: safeMaxValue / 2,
  }
})

const trendYAxisTicks = computed(() => {
  const { safeMaxValue, midValue } = trendChartStats.value
  return [
    { label: '0', value: 0 },
    { label: formatCurrencyTick(midValue), value: midValue },
    { label: formatCurrencyTick(safeMaxValue), value: safeMaxValue },
  ]
})

const trendXAxisTicks = computed(() => {
  const points = dailyTrendPoints.value
  if (points.length === 0) return []
  const indices = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]))

  return indices.map((index) => ({
    index,
    label: formatShortDate(points[index].date),
  }))
})

const trendPointMarkers = computed(() =>
  dailyTrendPoints.value.flatMap((point, index) => [
    {
      key: `${point.date}-expense`,
      kind: 'expense',
      x: getTrendX(index, dailyTrendPoints.value.length),
      y: getTrendY(point.expense || 0, trendChartStats.value.safeMaxValue),
      label: `${point.date} 支出 ¥${Number(point.expense || 0).toFixed(2)}`,
    },
    {
      key: `${point.date}-income`,
      kind: 'income',
      x: getTrendX(index, dailyTrendPoints.value.length),
      y: getTrendY(point.income || 0, trendChartStats.value.safeMaxValue),
      label: `${point.date} 收入 ¥${Number(point.income || 0).toFixed(2)}`,
    },
  ])
)

const hasTrendChart = computed(() => dailyTrendPoints.value.length >= 2)
const chartPathExpense = computed(() =>
  buildLinePath(dailyTrendPoints.value, 'expense', trendChartStats.value.safeMaxValue)
)
const chartPathIncome = computed(() =>
  buildLinePath(dailyTrendPoints.value, 'income', trendChartStats.value.safeMaxValue)
)

const categoryDistribution = computed(() => {
  const grouped = new Map()
  for (const entry of monthEntries.value.filter((item) => item.type === 'expense')) {
    const key = entry.categoryName || '未分类'
    grouped.set(key, (grouped.get(key) || 0) + (entry.amount || 0))
  }
  const total = [...grouped.values()].reduce((sum, value) => sum + value, 0)
  return [...grouped.entries()]
    .map(([name, amount], index) => ({
      name,
      amount,
      ratio: total > 0 ? amount / total : 0,
      color: chartColors[index % chartColors.length],
    }))
    .sort((a, b) => b.amount - a.amount)
})

const categorySegments = computed(() => {
  let offset = 0
  return categoryDistribution.value.map((item) => {
    const segment = {
      ...item,
      dasharray: `${item.ratio * 100} ${100 - item.ratio * 100}`,
      dashoffset: -offset,
    }
    offset += item.ratio * 100
    return segment
  })
})

const filteredCategories = computed(() => categories.value.filter((item) => item.type === form.value.type))

watch(
  () => form.value.type,
  () => {
    const currentCategory = categories.value.find((item) => item.id === form.value.categoryId)
    if (currentCategory && currentCategory.type !== form.value.type) {
      form.value.categoryId = ''
      form.value.categoryName = ''
    }
    if (showQuickCategoryCreate.value) {
      categoryCreateError.value = ''
    }
  }
)

watch(filteredCategories, (nextCategories) => {
  if (!form.value.categoryId) return
  const matched = nextCategories.find((item) => item.id === form.value.categoryId)
  if (matched) {
    form.value.categoryName = matched.name
    return
  }
  form.value.categoryId = ''
  form.value.categoryName = ''
})

const calendarCells = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const firstWeekday = (firstDay.getDay() + 6) % 7
  const startDate = new Date(year, month, 1 - firstWeekday)
  const summaryByDay = new Map()

  for (const entry of monthEntries.value) {
    const key = toDateKey(entry.occurredAt)
    const current = summaryByDay.get(key) || { expense: 0, income: 0 }
    if (entry.type === 'expense') current.expense += entry.amount || 0
    if (entry.type === 'income') current.income += entry.amount || 0
    summaryByDay.set(key, current)
  }

  const cells = []
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    const key = formatLocalDateKey(date)
    const daySummary = summaryByDay.get(key) || { expense: 0, income: 0 }
    cells.push({
      date: key,
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      expense: daySummary.expense,
      income: daySummary.income,
    })
  }
  return cells
})

async function refresh() {
  loading.value = true
  try {
    const [entryData, catData] = await Promise.all([listLedgerEntries({}), listLedgerCategories({})])
    const entryItems = entryData?.items || []
    entries.value = entryItems
    categories.value = catData?.items || []

    const range = getMonthRange(currentMonth.value)
    const fromMs = toTimeMs(range.from)
    const toMs = toTimeMs(range.to, { endOfDay: true })
    let inc = 0
    let exp = 0
    for (const entry of entryItems) {
      const occurredAtMs = toTimeMs(entry.occurredAt, { endOfDay: true })
      if (!Number.isFinite(occurredAtMs) || occurredAtMs < fromMs || occurredAtMs > toMs) continue
      if (entry.type === 'income') inc += entry.amount || 0
      else exp += entry.amount || 0
    }
    monthlyIncome.value = inc
    monthlyExpense.value = exp
  } catch {
    // ignore refresh failure
  } finally {
    loading.value = false
  }
}

function openQuickCategoryCreate() {
  draftCategoryName.value = ''
  categoryCreateError.value = ''
  showQuickCategoryCreate.value = true
}

function closeQuickCategoryCreate() {
  draftCategoryName.value = ''
  categoryCreateError.value = ''
  showQuickCategoryCreate.value = false
}

async function submitQuickCategoryCreate() {
  const name = draftCategoryName.value.trim()
  if (!name) {
    categoryCreateError.value = '先给这个类目起个名字吧。'
    return
  }

  creatingCategory.value = true
  categoryCreateError.value = ''

  try {
    const createCategory = form.value.type === 'income' ? createIncomeCategory : createExpenseCategory
    const result = await createCategory({ name })
    await refresh()

    const createdCategory =
      result?.category ?? categories.value.find((item) => item.name === name && item.type === form.value.type) ?? null

    if (createdCategory) {
      form.value.categoryId = createdCategory.id
      form.value.categoryName = createdCategory.name
    }

    closeQuickCategoryCreate()
  } catch (error) {
    const message = String(error?.message || '')
    categoryCreateError.value = message.includes('invalid category name')
      ? '这个类目名现在还不太合适，换一个更清楚的名字试试吧。'
      : message.includes('similar') || message.includes('duplicate')
        ? '好像已经有很接近的类目啦，换一个名字或者直接选已有的吧。'
        : '这次没能把类目建好，我们再试一次好不好。'
  } finally {
    creatingCategory.value = false
  }
}

function formatShortDate(dateText) {
  const [, month = '', day = ''] = String(dateText || '').split('-')
  if (!month || !day) return dateText
  return `${Number(month)}/${Number(day)}`
}

function formatCurrencyTick(value) {
  const amount = Number(value || 0)
  if (amount >= 1000) {
    return `¥${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`
  }
  if (amount >= 100) {
    return `¥${amount.toFixed(0)}`
  }
  return `¥${amount.toFixed(amount > 0 && amount < 10 ? 1 : 0)}`
}

function formatCurrencyLabel(value) {
  return `¥${Number(value || 0).toFixed(2)}`
}

function getTrendX(index, total) {
  const { width, paddingLeft, paddingRight } = trendChartFrame
  if (total <= 1) return paddingLeft
  return paddingLeft + (index * (width - paddingLeft - paddingRight)) / (total - 1)
}

function getTrendY(value, maxValue) {
  const { height, paddingTop, paddingBottom } = trendChartFrame
  const drawableHeight = height - paddingTop - paddingBottom
  return height - paddingBottom - ((value || 0) / Math.max(maxValue, 1)) * drawableHeight
}

function buildLinePath(points, key, maxValue) {
  if (points.length < 2) return ''
  return points
    .map((point, index) => {
      const x = getTrendX(index, points.length)
      const y = getTrendY(point[key] || 0, maxValue)
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}

async function submitEntry() {
  saving.value = true
  errorMsg.value = ''
  try {
    if (form.value.categoryId) {
      const cat = categories.value.find((c) => c.id === form.value.categoryId)
      if (cat) form.value.categoryName = cat.name
    }
    const fn = form.value.type === 'income' ? createIncomeEntry : createExpenseEntry
    await fn({
      amount: Number(form.value.amount),
      occurredAt: form.value.occurredAt,
      categoryId: form.value.categoryId || null,
      categoryName: form.value.categoryName || null,
      item: form.value.item || null,
    })
    form.value = {
      amount: '',
      type: 'expense',
      categoryId: '',
      categoryName: '',
      item: '',
      occurredAt: today(),
    }
    showForm.value = false
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '记账失败'
  } finally {
    saving.value = false
  }
}

function selectCalendarDate(date) {
  selectedDate.value = selectedDate.value === date ? '' : date
}

async function moveMonth(delta) {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + delta, 1)
  selectedDate.value = ''
  await refresh()
}

async function jumpToToday() {
  const today = new Date()
  currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
  selectedDate.value = formatLocalDateKey(today)
  await refresh()
}

function clearFilters() {
  selectedDate.value = ''
  typeFilter.value = ''
}

let stopListening = () => {}

onMounted(() => {
  refresh()
  stopListening = listenDataChanged((detail) => {
    if (detail?.ledger) refresh()
  })
})

onBeforeUnmount(() => {
  stopListening()
})
</script>

<template>
  <div class="lhome">
    <div class="loverview card">
      <div class="lovTitle">这个月的收支概览</div>
      <div class="lovGrid">
        <div class="lovItem">
          <span class="lovLabel">收入</span><span class="lovVal inc">+¥{{ monthlyIncome.toFixed(2) }}</span>
        </div>
        <div class="lovItem">
          <span class="lovLabel">支出</span><span class="lovVal exp">-¥{{ monthlyExpense.toFixed(2) }}</span>
        </div>
        <div class="lovItem">
          <span class="lovLabel">结余</span
          ><span class="lovVal">¥{{ (monthlyIncome - monthlyExpense).toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <LedgerCalendar
      :month-label="monthLabel"
      :weekday-labels="weekdayLabels"
      :cells="calendarCells"
      :selected-date="selectedDate"
      :today-date="todayDateKey"
      @prev-month="moveMonth(-1)"
      @next-month="moveMonth(1)"
      @select-date="selectCalendarDate"
    />

    <div class="lfilter card">
      <div class="lfilterText">{{ currentFilterLabel }}</div>
      <div class="lfilterActions">
        <select v-model="typeFilter">
          <option value="">收支都看</option>
          <option value="expense">只看支出</option>
          <option value="income">只看收入</option>
        </select>
        <button class="ghost" type="button" @click="jumpToToday">回到今天</button>
        <button class="ghost" type="button" @click="clearFilters">清除筛选</button>
      </div>
    </div>

    <div class="lcharts">
      <div class="lchart card">
        <div class="lchartHead">
          <div class="lchartTitle">钱主要花在了哪里</div>
          <div class="lchartHint">先看支出结构，比较容易一眼发现最近的花销重心。</div>
        </div>
        <div v-if="categoryDistribution.length === 0" class="lchartEmpty">这个月还没有支出记录。</div>
        <div v-else class="ldonutWrap">
          <svg viewBox="0 0 42 42" class="ldonut">
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#EFEAE4" stroke-width="6"></circle>
            <circle
              v-for="segment in categorySegments"
              :key="segment.name"
              cx="21"
              cy="21"
              r="15.9155"
              fill="none"
              :stroke="segment.color"
              stroke-width="6"
              :stroke-dasharray="segment.dasharray"
              :stroke-dashoffset="segment.dashoffset"
            ></circle>
          </svg>
          <div class="ldonutLegend">
            <div v-for="segment in categoryDistribution" :key="segment.name" class="ldonutItem">
              <span class="ldonutColor" :style="{ background: segment.color }"></span>
              <span class="ldonutName">{{ segment.name }}</span>
              <span class="ldonutValue">¥{{ segment.amount.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="lchart card">
        <div class="lchartHead">
          <div class="lchartTitle">这几天的收支走势</div>
          <div class="lchartHint">支出 / 收入</div>
        </div>
        <div v-if="dailyTrendPoints.length === 0" class="lchartEmpty">这个月还没有记录，所以暂时看不到走势。</div>
        <div v-else-if="!hasTrendChart" class="lchartEmpty">
          目前只有一天的记录，等多记几笔后，这里就能看出变化趋势了。
        </div>
        <div v-else class="ltrendWrap">
          <svg
            :viewBox="`0 0 ${trendChartFrame.width} ${trendChartFrame.height}`"
            class="ltrend"
            role="img"
            aria-label="收支趋势图，横轴为日期，纵轴为金额"
          >
            <line
              v-for="tick in trendYAxisTicks"
              :key="`grid-${tick.value}`"
              class="ltrendGrid"
              :x1="trendChartFrame.paddingLeft"
              :x2="trendChartFrame.width - trendChartFrame.paddingRight"
              :y1="getTrendY(tick.value, trendChartStats.safeMaxValue)"
              :y2="getTrendY(tick.value, trendChartStats.safeMaxValue)"
            />
            <line
              class="ltrendAxis"
              :x1="trendChartFrame.paddingLeft"
              :x2="trendChartFrame.paddingLeft"
              :y1="trendChartFrame.paddingTop"
              :y2="trendChartFrame.height - trendChartFrame.paddingBottom"
            />
            <line
              class="ltrendAxis"
              :x1="trendChartFrame.paddingLeft"
              :x2="trendChartFrame.width - trendChartFrame.paddingRight"
              :y1="trendChartFrame.height - trendChartFrame.paddingBottom"
              :y2="trendChartFrame.height - trendChartFrame.paddingBottom"
            />
            <text class="ltrendAxisTitle y" :x="14" :y="trendChartFrame.paddingTop + 10">金额</text>
            <text
              class="ltrendAxisTitle x"
              :x="trendChartFrame.width - trendChartFrame.paddingRight"
              :y="trendChartFrame.height - 8"
            >
              日期
            </text>
            <text
              v-for="tick in trendYAxisTicks"
              :key="`ylabel-${tick.value}`"
              class="ltrendTickLabel y"
              :x="trendChartFrame.paddingLeft - 8"
              :y="getTrendY(tick.value, trendChartStats.safeMaxValue) + 4"
            >
              {{ tick.label }}
            </text>
            <text
              v-for="tick in trendXAxisTicks"
              :key="`xlabel-${tick.index}`"
              class="ltrendTickLabel x"
              :x="getTrendX(tick.index, dailyTrendPoints.length)"
              :y="trendChartFrame.height - 8"
            >
              {{ tick.label }}
            </text>
            <path
              v-if="chartPathExpense"
              :d="chartPathExpense"
              fill="none"
              stroke="var(--danger)"
              stroke-width="3"
              stroke-linecap="round"
            ></path>
            <path
              v-if="chartPathIncome"
              :d="chartPathIncome"
              fill="none"
              stroke="var(--success)"
              stroke-width="3"
              stroke-linecap="round"
            ></path>
            <g v-for="marker in trendPointMarkers" :key="marker.key">
              <title>{{ marker.label }}</title>
              <circle :cx="marker.x" :cy="marker.y" r="3.5" class="ltrendPoint" :class="marker.kind" />
            </g>
          </svg>
          <div class="ltrendLegend">
            <span><i class="legendDot exp"></i>支出趋势线</span>
            <span><i class="legendDot inc"></i>收入趋势线</span>
            <span class="ltrendAxisHint">横轴：日期</span>
            <span class="ltrendAxisHint">纵轴：金额</span>
            <span class="ltrendAxisHint">本月最高单日波动：{{ formatCurrencyLabel(trendChartStats.maxValue) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="lquick card">
      <div class="lquickHead">
        <div>
          <div class="lquickTitle">记一笔</div>
          <div class="lquickHint">想起一笔就顺手记下，别让它从脑子里溜走。</div>
        </div>
        <button class="primary" @click="showForm = !showForm">{{ showForm ? '收起' : '记一笔' }}</button>
      </div>

      <div v-if="showForm" class="lquickForm">
        <div class="lquickRow">
          <input v-model="form.amount" type="number" placeholder="金额" step="0.01" />
          <select v-model="form.type">
            <option value="expense">支出</option>
            <option value="income">收入</option>
          </select>
        </div>
        <input v-model="form.item" placeholder="这笔钱是做什么的" />
        <input v-model="form.occurredAt" type="date" />
        <div class="lquickCategoryRow">
          <select v-model="form.categoryId">
            <option value="">选择类目</option>
            <option v-for="c in filteredCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <button class="ghost lquickCategoryCreate" type="button" @click="openQuickCategoryCreate">新建类目</button>
        </div>
        <div v-if="showQuickCategoryCreate" class="lquickCategoryCreateBox">
          <div class="lquickCategoryCreateTitle">给这笔{{ form.type === 'income' ? '收入' : '支出' }}新起一个类目</div>
          <div class="lquickCategoryCreateHint">建好后会自动帮你选中，不会把这笔记账内容弄丢。</div>
          <div class="lquickCategoryCreateActions">
            <input
              v-model="draftCategoryName"
              placeholder="比如：游戏充值、云服务、学习资料"
              @keydown.enter.prevent="submitQuickCategoryCreate"
            />
            <button
              class="primary"
              type="button"
              :disabled="creatingCategory || !draftCategoryName.trim()"
              @click="submitQuickCategoryCreate"
            >
              {{ creatingCategory ? '创建中…' : '创建并选中' }}
            </button>
            <button class="ghost" type="button" :disabled="creatingCategory" @click="closeQuickCategoryCreate">
              取消
            </button>
          </div>
          <div v-if="categoryCreateError" class="lquickCategoryError">{{ categoryCreateError }}</div>
        </div>
        <button class="primary" :disabled="saving || !form.amount" @click="submitEntry">
          {{ saving ? '保存中…' : '保存' }}
        </button>
        <div v-if="errorMsg" class="lquickError">{{ errorMsg }}</div>
      </div>
    </div>

    <div class="lrecent card">
      <div class="lrecentHead">
        <div>
          <div class="lrecentTitle">{{ selectedDate ? '这一天的记录' : '这个月的记录' }}</div>
          <div class="lrecentHint">收支分开看得更清楚，类目和日期也会一起带上。</div>
        </div>
        <button class="ghost" @click="showAllEntries = !showAllEntries">
          {{ showAllEntries ? '收起' : '查看全部' }}
        </button>
      </div>
      <div v-if="visibleEntries.length === 0" class="lrecentEmpty">当前筛选下还没有记录。</div>
      <div v-else class="lrecentList">
        <div
          v-for="e in visibleEntries.slice(0, showAllEntries ? undefined : 8)"
          :key="e.id"
          class="lrecentRow"
          :class="e.type === 'income' ? 'income' : 'expense'"
        >
          <span class="lrecentType">{{ e.type === 'income' ? '收入' : '支出' }}</span>
          <div class="lrecentMain">
            <span class="lrecentItem">{{ e.item || e.categoryName || '未分类' }}</span>
            <span class="lrecentCat"
              >{{ toDateKey(e.occurredAt) }}{{ e.categoryName ? ' · ' + e.categoryName : '' }}</span
            >
          </div>
          <span class="lrecentAmt" :class="e.type === 'income' ? 'inc' : 'exp'">
            {{ e.type === 'income' ? '+' : '-' }}¥{{ e.amount?.toFixed(2) }}
          </span>
        </div>
      </div>
    </div>

    <div class="lcat card">
      <button @click="showForm = true">管理收支类目 →</button>
    </div>
  </div>
</template>

<style scoped>
.lhome {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-right: 4px;
}
.lhome::-webkit-scrollbar {
  width: 4px;
}
.lhome::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 999px;
}

.loverview {
  background: var(--ledger-tint);
  padding: 16px 20px;
}
.lovTitle {
  font-weight: 700;
  font-size: 14px;
  color: var(--muted);
  margin-bottom: 8px;
}
.lovGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
}
.lovItem {
  text-align: center;
  padding: 4px 0;
  border-right: 1px solid var(--border);
}
.lovItem:last-child {
  border-right: none;
}
.lovLabel {
  font-size: 11px;
  color: var(--muted);
  display: block;
  margin-bottom: 4px;
}
.lovVal {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.lovVal.inc {
  color: var(--success);
}
.lovVal.exp {
  color: var(--danger);
}

.lfilter {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #fffdfc;
}

.lfilterText {
  font-size: 13px;
  color: var(--text);
}

.lfilterActions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.lfilterActions select {
  width: 120px;
}

.lcharts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.lchart {
  padding: 14px 16px;
}

.lchartHead {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lchartTitle {
  font-weight: 700;
}

.lchartHint {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}

.lchartEmpty {
  margin-top: 14px;
  color: var(--muted);
  font-size: 13px;
}

.ldonutWrap {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 18px;
}

.ldonut {
  width: 140px;
  height: 140px;
  transform: rotate(-90deg);
  flex: 0 0 auto;
}

.ldonutLegend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ldonutItem {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}

.ldonutColor {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.ldonutName {
  color: var(--text);
}

.ldonutValue {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.ltrendWrap {
  margin-top: 12px;
}

.ltrend {
  width: 100%;
  height: 176px;
}

.ltrendAxis {
  stroke: rgba(60, 52, 48, 0.28);
  stroke-width: 1;
}

.ltrendGrid {
  stroke: rgba(60, 52, 48, 0.12);
  stroke-width: 1;
  stroke-dasharray: 3 4;
}

.ltrendTickLabel {
  fill: var(--muted);
  font-size: 10px;
}

.ltrendAxisTitle {
  fill: var(--muted);
  font-size: 10px;
  font-weight: 700;
}

.ltrendAxisTitle.x {
  text-anchor: end;
}

.ltrendTickLabel.y {
  text-anchor: end;
}

.ltrendTickLabel.x {
  text-anchor: middle;
}

.ltrendLegend {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
  color: var(--muted);
}

.ltrendPoint {
  stroke: #fffdfc;
  stroke-width: 1.5;
}

.ltrendPoint.expense {
  fill: var(--danger);
}

.ltrendPoint.income {
  fill: var(--success);
}

.ltrendAxisHint {
  color: var(--muted);
}

.legendDot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  margin-right: 6px;
}

.legendDot.exp {
  background: var(--danger);
}
.legendDot.inc {
  background: var(--success);
}

.lquick {
  padding: 14px 20px;
}
.lquickHead {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.lquickTitle {
  font-weight: 700;
}
.lquickHint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}
.lquickForm {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.lquickForm > button,
.lquickForm > .lquickRow,
.lquickForm > .lquickCategoryRow,
.lquickForm > .lquickCategoryCreateBox,
.lquickForm > .lquickError {
  grid-column: 1 / -1;
}
.lquickRow {
  display: flex;
  gap: 8px;
}
.lquickCategoryRow {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}
.lquickCategoryCreate {
  white-space: nowrap;
}
.lquickCategoryCreateBox {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #fffdfc;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lquickCategoryCreateTitle {
  font-size: 13px;
  font-weight: 700;
}
.lquickCategoryCreateHint {
  font-size: 12px;
  color: var(--muted);
}
.lquickCategoryCreateActions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
}
.lquickCategoryError {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(217, 106, 92, 0.2);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 12px;
}
.lquickError {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(217, 106, 92, 0.2);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 12px;
}

.lrecent {
  padding: 14px 20px;
}
.lrecentHead {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 12px;
}
.lrecentTitle {
  font-weight: 700;
}
.lrecentHint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}
.lrecentEmpty {
  color: var(--muted);
  font-size: 13px;
  padding: 10px 0;
}
.lrecentList {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lrecentRow {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  font-size: 13px;
  background: #ffffff;
}

.lrecentRow.expense {
  background: #fff9f8;
}

.lrecentRow.income {
  background: #f8fcf8;
}

.lrecentType {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.05);
  color: var(--muted);
}

.lrecentMain {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lrecentItem {
  font-weight: 600;
}
.lrecentCat {
  font-size: 11px;
  color: var(--muted);
}

.lrecentAmt {
  font-weight: 700;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}
.lrecentAmt.inc {
  color: var(--success);
}
.lrecentAmt.exp {
  color: var(--danger);
}

.lcat {
  padding: 10px 20px;
  text-align: center;
  font-size: 13px;
}

@media (max-width: 900px) {
  .lcharts {
    grid-template-columns: 1fr;
  }

  .ldonutWrap {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 720px) {
  .lfilter,
  .lquickHead,
  .lrecentHead {
    flex-direction: column;
    align-items: stretch;
  }

  .lfilterActions {
    flex-direction: column;
    align-items: stretch;
  }

  .lfilterActions select {
    width: 100%;
  }

  .lquickForm {
    grid-template-columns: 1fr;
  }

  .lquickRow,
  .lquickCategoryCreateActions {
    flex-direction: column;
  }

  .lquickCategoryRow,
  .lquickCategoryCreateActions {
    grid-template-columns: 1fr;
  }
}
</style>
