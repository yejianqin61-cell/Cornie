<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  cancelSchedule,
  createSchedule,
  deleteSchedule,
  listScheduleCategories,
  listSchedules,
  restoreSchedule,
} from '../api'
import { listenDataChanged } from '../syncSignals'
import ScheduleCalendar from './ScheduleCalendar.vue'
import UiButton from './ui/UiButton.vue'

const schedules = ref([])
const categories = ref([])
const loading = ref(false)
const newForm = ref({ title: '', startAt: '', endAt: '', categoryId: '', location: '' })
const showForm = ref(false)
const adding = ref(false)
const errorMsg = ref('')

const todayCount = ref(0)
const currentMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const selectedDate = ref('')

const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日']

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

function getMonthRange(date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    from: formatLocalDateKey(start),
    to: formatLocalDateKey(end),
  }
}

const monthLabel = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth() + 1
  return `${year}年${month}月`
})

const scheduleDates = computed(() => new Set(schedules.value.map((item) => toDateKey(item.startAt))))

const filteredSchedules = computed(() => {
  if (!selectedDate.value) return schedules.value
  return schedules.value.filter((item) => toDateKey(item.startAt) === selectedDate.value)
})

const currentFilterLabel = computed(() => {
  if (!selectedDate.value) return '正在看这个月的安排'
  return `正在看 ${selectedDate.value} 的安排`
})

const calendarCells = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const firstWeekday = (firstDay.getDay() + 6) % 7
  const startDate = new Date(year, month, 1 - firstWeekday)
  const cells = []

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    const dateKey = formatLocalDateKey(date)
    cells.push({
      date: dateKey,
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      hasEntries: scheduleDates.value.has(dateKey),
    })
  }

  return cells
})

async function refresh() {
  loading.value = true
  try {
    const today = formatLocalDateKey(new Date())
    const range = getMonthRange(currentMonth.value)
    const [schData, catData] = await Promise.all([
      listSchedules({ from: range.from, to: range.to }),
      listScheduleCategories(),
    ])
    schedules.value = schData?.items || []
    categories.value = catData?.items || []
    todayCount.value = schedules.value.filter((s) => s.startAt?.startsWith(today)).length
  } catch {
    /* ignore */
  } finally {
    loading.value = false
  }
}

async function addSchedule() {
  const title = newForm.value.title.trim()
  if (!title || !newForm.value.startAt) return
  adding.value = true
  errorMsg.value = ''
  try {
    const cat = categories.value.find((c) => c.id === newForm.value.categoryId)
    await createSchedule({
      title,
      startAt: newForm.value.startAt,
      endAt: newForm.value.endAt || null,
      categoryId: newForm.value.categoryId || null,
      categoryName: cat?.name || null,
      location: newForm.value.location || null,
      status: 'active',
    })
    newForm.value = { title: '', startAt: '', endAt: '', categoryId: '', location: '' }
    showForm.value = false
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '添加失败'
  } finally {
    adding.value = false
  }
}

function selectCalendarDate(date) {
  if (selectedDate.value === date) {
    selectedDate.value = ''
    return
  }
  selectedDate.value = date
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

function clearDateFilter() {
  selectedDate.value = ''
}

async function toggleStatus(sch) {
  try {
    if (sch.status === 'cancelled') {
      await restoreSchedule(sch.id)
    } else {
      await cancelSchedule(sch.id)
    }
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '操作失败'
  }
}

async function removeSchedule(id) {
  if (!confirm('确定删除这条日程吗？')) return
  try {
    await deleteSchedule(id)
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '删除失败'
  }
}

let stopListening = () => {}

onMounted(() => {
  refresh()
  stopListening = listenDataChanged((detail) => {
    if (detail?.schedule) refresh()
  })
})

onBeforeUnmount(() => {
  stopListening()
})
</script>

<template>
  <div class="shome">
    <!-- 摘要 -->
    <div class="ssummary card" style="background: var(--schedule-tint)">
      <div class="ssumText">
        今天有 <strong>{{ todayCount }}</strong> 项安排
      </div>
    </div>

    <ScheduleCalendar
      :month-label="monthLabel"
      :weekday-labels="weekdayLabels"
      :cells="calendarCells"
      :selected-date="selectedDate"
      :today-date="todayDateKey"
      @prev-month="moveMonth(-1)"
      @next-month="moveMonth(1)"
      @select-date="selectCalendarDate"
    />

    <div class="scontrolRow" :class="{ expanded: showForm }">
      <div class="stoolbar card">
        <div class="stoolbarTop">
          <div class="stoolbarInfo">
            <div class="stoolbarLabel">当前查看</div>
            <div class="stoolbarText">{{ currentFilterLabel }}</div>
          </div>
          <div class="stoolbarActions">
            <UiButton variant="ghost" type="button" @click="jumpToToday">回到今天</UiButton>
            <UiButton variant="ghost" type="button" :disabled="!selectedDate" @click="clearDateFilter"
              >清除筛选</UiButton
            >
            <UiButton variant="default" type="button" @click="showForm = !showForm">
              {{ showForm ? '收起新增' : '新增安排' }}
            </UiButton>
          </div>
        </div>
      </div>

      <div v-if="showForm" class="squickCard card">
        <div class="squickHead">
          <div class="squickTitle">新增安排</div>
          <UiButton variant="ghost" type="button" @click="showForm = false">取消</UiButton>
        </div>
        <div class="squickForm">
          <input v-model="newForm.title" placeholder="标题" />
          <div class="squickRow">
            <input v-model="newForm.startAt" type="datetime-local" />
            <input v-model="newForm.endAt" type="datetime-local" placeholder="结束时间（可选）" />
          </div>
          <div class="squickRow">
            <select v-model="newForm.categoryId">
              <option value="">类目</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <input v-model="newForm.location" placeholder="地点（可选）" />
          </div>
          <UiButton
            variant="default"
            :disabled="adding || !newForm.title.trim() || !newForm.startAt"
            @click="addSchedule"
          >
            {{ adding ? '保存中…' : '保存' }}
          </UiButton>
          <div v-if="errorMsg" class="serr">{{ errorMsg }}</div>
        </div>
      </div>
    </div>

    <!-- 日程列表 -->
    <div class="slist card">
      <div class="slistHead">
        <div class="slistTitle">{{ selectedDate ? '这一天的安排' : '这个月的安排' }}</div>
      </div>
      <div v-if="filteredSchedules.length === 0 && !loading" class="sempty">还没有日程安排</div>
      <div v-else class="sitems">
        <div v-for="s in filteredSchedules" :key="s.id" class="sitem" :class="{ cancelled: s.status === 'cancelled' }">
          <span class="sitemTime">{{ s.startAt?.replace('T', ' ') }}</span>
          <div class="sitemMain">
            <span class="sitemTitle">{{ s.title }}</span>
            <div class="sitemMeta">
              <span class="sitemCat" v-if="s.categoryName">{{ s.categoryName }}</span>
              <span class="sitemLoc" v-if="s.location">{{ s.location }}</span>
            </div>
          </div>
          <div class="sitemActions">
            <UiButton variant="ghost" size="sm" @click="toggleStatus(s)">
              {{ s.status === 'cancelled' ? '恢复' : '取消' }}
            </UiButton>
            <UiButton variant="dangerGhost" size="sm" @click="removeSchedule(s.id)">删除</UiButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shome {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
}
.shome::-webkit-scrollbar {
  width: 4px;
}
.shome::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
  border-radius: 999px;
}

.ssummary {
  background: var(--schedule-tint);
  padding: 12px 20px;
  text-align: center;
}
.ssumText {
  font-size: var(--text-md);
}

.scontrolRow {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.scontrolRow.expanded {
  grid-template-columns: minmax(320px, 1.15fr) minmax(320px, 0.95fr);
  align-items: start;
}

.stoolbar {
  padding: 12px 16px;
  background: var(--color-surface);
}

.stoolbarTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stoolbarInfo {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stoolbarLabel {
  font-size: var(--text-xs);
  color: var(--muted);
}

.stoolbarText {
  font-size: var(--text-base);
  color: var(--text);
}

.stoolbarActions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.squickCard {
  padding: 12px 16px;
  background: var(--color-surface);
}
.squickHead {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.squickTitle {
  font-weight: 700;
}
.squickForm {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.squickForm > input:first-child,
.squickForm > .squickRow:first-of-type,
.squickForm > button,
.squickForm > .serr {
  grid-column: 1 / -1;
}
.squickRow {
  display: flex;
  gap: 8px;
}
.serr {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-danger) 6%, transparent);
  color: var(--danger);
  font-size: var(--text-sm);
}

.slist {
  padding: 12px 20px;
}
.slistHead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.slistTitle {
  font-weight: 700;
}
.sempty {
  color: var(--muted);
  font-size: var(--text-base);
  padding: 10px 0;
}
.sitems {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sitem {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
}
.sitem:hover {
  background: var(--surface-2);
}
.sitem.cancelled {
  opacity: 0.4;
}
.sitemTime {
  color: var(--muted);
  font-size: var(--text-sm);
  white-space: nowrap;
}
.sitemMain {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sitemTitle {
  font-weight: 500;
}
.sitemMeta {
  display: flex;
  gap: 6px;
  align-items: center;
}
.sitemCat {
  font-size: var(--text-xs);
  color: var(--muted);
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-2);
}
.sitemLoc {
  font-size: var(--text-xs);
  color: var(--muted);
}
.sitemActions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.15s;
}
.sitem:hover .sitemActions {
  opacity: 1;
}

@media (max-width: 720px) {
  .scontrolRow.expanded {
    grid-template-columns: 1fr;
  }

  .stoolbarTop,
  .squickHead,
  .slistHead {
    flex-direction: column;
    align-items: stretch;
  }

  .stoolbarActions {
    justify-content: flex-start;
  }

  .stoolbarActions > button {
    width: 100%;
  }
}
</style>
