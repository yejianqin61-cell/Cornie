<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { createExpenseEntry, createIncomeEntry, listLedgerEntries, listLedgerCategories } from '../api'
import { listenDataChanged } from '../syncSignals'
import LedgerCalendar from './LedgerCalendar.vue'

const entries = ref([])
const categories = ref([])
const loading = ref(false)
const showForm = ref(false)
const form = ref({
  amount: '',
  type: 'expense',
  categoryId: '',
  categoryName: '',
  item: '',
  occurredAt: new Date().toISOString().slice(0, 10)
})
const saving = ref(false)
const errorMsg = ref('')
const currentMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const selectedDate = ref('')
const typeFilter = ref('')

const monthlyIncome = ref(0)
const monthlyExpense = ref(0)

const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日']
const chartColors = ['#E8856A', '#E4A35E', '#5B9A6B', '#8DB5A7', '#C59E7A', '#D96A5C']

function toDateKey(value) {
  return new Date(value).toISOString().slice(0, 10)
}

function getMonthRange(date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    from: `${start.toISOString().slice(0, 10)}T00:00:00.000Z`,
    to: `${end.toISOString().slice(0, 10)}T23:59:59.999Z`
  }
}

const monthLabel = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth() + 1
  return `${year}年${month}月`
})

const monthEntries = computed(() => {
  const range = getMonthRange(currentMonth.value)
  return entries.value.filter((entry) => entry.occurredAt >= range.from && entry.occurredAt <= range.to)
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

const chartPathExpense = computed(() => buildLinePath(dailyTrendPoints.value, 'expense'))
const chartPathIncome = computed(() => buildLinePath(dailyTrendPoints.value, 'income'))

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
      color: chartColors[index % chartColors.length]
    }))
    .sort((a, b) => b.amount - a.amount)
})

const categorySegments = computed(() => {
  let offset = 0
  return categoryDistribution.value.map((item) => {
    const segment = {
      ...item,
      dasharray: `${item.ratio * 100} ${100 - item.ratio * 100}`,
      dashoffset: -offset
    }
    offset += item.ratio * 100
    return segment
  })
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
    const key = date.toISOString().slice(0, 10)
    const daySummary = summaryByDay.get(key) || { expense: 0, income: 0 }
    cells.push({
      date: key,
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      expense: daySummary.expense,
      income: daySummary.income
    })
  }
  return cells
})

async function refresh() {
  loading.value = true
  try {
    const [entryData, catData] = await Promise.all([
      listLedgerEntries({}),
      listLedgerCategories({})
    ])
    const entryItems = entryData?.items || []
    entries.value = entryItems
    categories.value = catData?.items || []

    const range = getMonthRange(currentMonth.value)
    let inc = 0
    let exp = 0
    for (const entry of entryItems) {
      if (entry.occurredAt < range.from || entry.occurredAt > range.to) continue
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

function buildLinePath(points, key) {
  if (points.length === 0) return ''
  const width = 280
  const height = 104
  const paddingX = 8
  const values = points.map((item) => item[key] || 0)
  const maxValue = Math.max(...values, 1)
  return points
    .map((point, index) => {
      const x = paddingX + (index * (width - paddingX * 2)) / Math.max(points.length - 1, 1)
      const y = height - ((point[key] || 0) / maxValue) * (height - 12) - 6
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}

async function submitEntry() {
  saving.value = true
  errorMsg.value = ''
  try {
    if (form.value.categoryId && form.value.categoryName) {
      const cat = categories.value.find((c) => c.id === form.value.categoryId)
      if (cat) form.value.categoryName = cat.name
    }
    const fn = form.value.type === 'income' ? createIncomeEntry : createExpenseEntry
    await fn({
      amount: Number(form.value.amount),
      occurredAt: form.value.occurredAt,
      categoryId: form.value.categoryId || null,
      categoryName: form.value.categoryName || null,
      item: form.value.item || null
    })
    form.value = {
      amount: '',
      type: 'expense',
      categoryId: '',
      categoryName: '',
      item: '',
      occurredAt: new Date().toISOString().slice(0, 10)
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
  selectedDate.value = today.toISOString().slice(0, 10)
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
        <div class="lovItem"><span class="lovLabel">收入</span><span class="lovVal inc">+¥{{ monthlyIncome.toFixed(2) }}</span></div>
        <div class="lovItem"><span class="lovLabel">支出</span><span class="lovVal exp">-¥{{ monthlyExpense.toFixed(2) }}</span></div>
        <div class="lovItem"><span class="lovLabel">结余</span><span class="lovVal">¥{{ (monthlyIncome - monthlyExpense).toFixed(2) }}</span></div>
      </div>
    </div>

    <LedgerCalendar
      :month-label="monthLabel"
      :weekday-labels="weekdayLabels"
      :cells="calendarCells"
      :selected-date="selectedDate"
      :today-date="new Date().toISOString().slice(0, 10)"
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
          <div class="lchartHint">红线看支出，绿线看收入，方便快速判断最近哪几天波动更大。</div>
        </div>
        <div v-if="dailyTrendPoints.length === 0" class="lchartEmpty">这个月还没有足够的记录可以画趋势。</div>
        <div v-else class="ltrendWrap">
          <svg viewBox="0 0 296 112" class="ltrend">
            <path v-if="chartPathExpense" :d="chartPathExpense" fill="none" stroke="var(--danger)" stroke-width="3" stroke-linecap="round"></path>
            <path v-if="chartPathIncome" :d="chartPathIncome" fill="none" stroke="var(--success)" stroke-width="3" stroke-linecap="round"></path>
          </svg>
          <div class="ltrendLegend">
            <span><i class="legendDot exp"></i>支出</span>
            <span><i class="legendDot inc"></i>收入</span>
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
        <select v-model="form.categoryId">
          <option value="">选择类目</option>
          <option v-for="c in categories.filter((x) => x.type === form.type)" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
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
        <button class="ghost" @click="$emit('go', 'detail')">查看全部</button>
      </div>
      <div v-if="visibleEntries.length === 0" class="lrecentEmpty">当前筛选下还没有记录。</div>
      <div v-else class="lrecentList">
        <div v-for="e in visibleEntries.slice(0, 8)" :key="e.id" class="lrecentRow" :class="e.type === 'income' ? 'income' : 'expense'">
          <span class="lrecentType">{{ e.type === 'income' ? '收入' : '支出' }}</span>
          <div class="lrecentMain">
            <span class="lrecentItem">{{ e.item || e.categoryName || '未分类' }}</span>
            <span class="lrecentCat">{{ toDateKey(e.occurredAt) }}{{ e.categoryName ? ' · ' + e.categoryName : '' }}</span>
          </div>
          <span class="lrecentAmt" :class="e.type === 'income' ? 'inc' : 'exp'">
            {{ e.type === 'income' ? '+' : '-' }}¥{{ e.amount?.toFixed(2) }}
          </span>
        </div>
      </div>
    </div>

    <div class="lcat card">
      <button @click="$emit('go', 'category')">管理收支类目 →</button>
    </div>
  </div>
</template>

<style scoped>
.lhome{ height: 100%; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding-right: 4px; }
.lhome::-webkit-scrollbar{ width: 4px; }
.lhome::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.08); border-radius: 999px; }

.loverview{ background: var(--ledger-tint); padding: 16px 20px; }
.lovTitle{ font-weight: 700; font-size: 14px; color: var(--muted); margin-bottom: 8px; }
.lovGrid{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
.lovItem{
  text-align: center;
  padding: 4px 0;
  border-right: 1px solid var(--border);
}
.lovItem:last-child{ border-right: none; }
.lovLabel{ font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px; }
.lovVal{ font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.lovVal.inc{ color: var(--success); }
.lovVal.exp{ color: var(--danger); }

.lfilter{
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #FFFDFC;
}

.lfilterText{
  font-size: 13px;
  color: var(--text);
}

.lfilterActions{
  display: flex;
  gap: 8px;
  align-items: center;
}

.lfilterActions select{
  width: 120px;
}

.lcharts{
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.lchart{
  padding: 14px 16px;
}

.lchartHead{
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lchartTitle{
  font-weight: 700;
}

.lchartHint{
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}

.lchartEmpty{
  margin-top: 14px;
  color: var(--muted);
  font-size: 13px;
}

.ldonutWrap{
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 18px;
}

.ldonut{
  width: 140px;
  height: 140px;
  transform: rotate(-90deg);
  flex: 0 0 auto;
}

.ldonutLegend{
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ldonutItem{
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}

.ldonutColor{
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.ldonutName{
  color: var(--text);
}

.ldonutValue{
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.ltrendWrap{
  margin-top: 12px;
}

.ltrend{
  width: 100%;
  height: 130px;
}

.ltrendLegend{
  margin-top: 6px;
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: var(--muted);
}

.legendDot{
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  margin-right: 6px;
}

.legendDot.exp{ background: var(--danger); }
.legendDot.inc{ background: var(--success); }

.lquick{ padding: 14px 20px; }
.lquickHead{ display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.lquickTitle{ font-weight: 700; }
.lquickHint{ margin-top: 4px; font-size: 12px; color: var(--muted); }
.lquickForm{ margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.lquickForm > button,
.lquickForm > .lquickRow,
.lquickForm > input:nth-child(5),
.lquickForm > .lquickError{ grid-column: 1 / -1; }
.lquickRow{ display: flex; gap: 8px; }
.lquickError{
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(217,106,92,.20);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 12px;
}

.lrecent{ padding: 14px 20px; }
.lrecentHead{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 12px; }
.lrecentTitle{ font-weight: 700; }
.lrecentHint{ margin-top: 4px; font-size: 12px; color: var(--muted); }
.lrecentEmpty{ color: var(--muted); font-size: 13px; padding: 10px 0; }
.lrecentList{ display: flex; flex-direction: column; gap: 6px; }
.lrecentRow{
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  font-size: 13px;
  background: #FFFFFF;
}

.lrecentRow.expense{
  background: #FFF9F8;
}

.lrecentRow.income{
  background: #F8FCF8;
}

.lrecentType{
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(0,0,0,.05);
  color: var(--muted);
}

.lrecentMain{ min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.lrecentItem{ font-weight: 600; }
.lrecentCat{
  font-size: 11px;
  color: var(--muted);
}

.lrecentAmt{
  font-weight: 700;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}
.lrecentAmt.inc{ color: var(--success); }
.lrecentAmt.exp{ color: var(--danger); }

.lcat{ padding: 10px 20px; text-align: center; font-size: 13px; }

@media (max-width: 900px){
  .lcharts{
    grid-template-columns: 1fr;
  }

  .ldonutWrap{
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 720px){
  .lfilter,
  .lquickHead,
  .lrecentHead{
    flex-direction: column;
    align-items: stretch;
  }

  .lfilterActions{
    flex-direction: column;
    align-items: stretch;
  }

  .lfilterActions select{
    width: 100%;
  }

  .lquickForm{
    grid-template-columns: 1fr;
  }

  .lquickRow{
    flex-direction: column;
  }
}
</style>
