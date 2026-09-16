<script setup>
import DiaryCalendarMonth from './DiaryCalendarMonth.vue'
import DiaryCard from './DiaryCard.vue'
import OnThisDayCard from './OnThisDayCard.vue'
import DiaryEmptyState from './DiaryEmptyState.vue'
import DiaryRegenerateBtn from './DiaryRegenerateBtn.vue'
import PageHeader from '../common/PageHeader.vue'
import { ref, computed, watch } from 'vue'
import { BookOpen, Clock } from '@lucide/vue'
import { listEntries, getEntry, upsertEntry, regenerateCornie, getOnThisDay } from '../../api/diary.js'

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const selectedDate = ref(now.toISOString().slice(0, 10))
const entries = ref([])
const entry = ref(null)
const onThisDayItems = ref([])
const loading = ref(false)

const monthKey = computed(() => `${year.value}-${String(month.value).padStart(2, '0')}`)

function toYearMonth(dateStr) {
  const [y, m] = dateStr.split('-')
  return { year: Number(y), month: Number(m) }
}

async function fetchMonth() {
  try {
    const res = await listEntries({ month: monthKey.value })
    entries.value = (res.entries || []).map((e) => ({ ...e, date: e.date }))
  } catch {
    entries.value = []
  }
}

async function fetchEntry() {
  loading.value = true
  try {
    const res = await getEntry(selectedDate.value)
    entry.value = res.entry
  } catch {
    entry.value = null
  }
  loading.value = false
}

async function fetchOnThisDay() {
  try {
    const [, m, d] = selectedDate.value.split('-')
    const res = await getOnThisDay(`${year.value}-${m}-${d}`)
    onThisDayItems.value = res.items || []
  } catch {
    onThisDayItems.value = []
  }
}

watch(monthKey, fetchMonth, { immediate: true })
watch(selectedDate, () => {
  fetchEntry()
  fetchOnThisDay()
}, { immediate: true })

function selectDay(date) {
  selectedDate.value = date
  const d = toYearMonth(date)
  year.value = d.year
  month.value = d.month
  fetchMonth()
}

function prevMonth() {
  if (month.value === 1) {
    year.value--
    month.value = 12
  } else {
    month.value--
  }
}

function nextMonth() {
  if (month.value === 12) {
    year.value++
    month.value = 1
  } else {
    month.value++
  }
}

async function saveUserText(text) {
  try {
    const res = await upsertEntry(selectedDate.value, { userText: text })
    entry.value = res.entry
    fetchMonth()
  } catch {
    // ignore
  }
}

async function doRegenerate() {
  try {
    const res = await regenerateCornie(selectedDate.value)
    entry.value = res.entry
  } catch {
    // ignore
  }
}

const hasContent = computed(
  () => entry.value && (entry.value.userText || entry.value.cornieText),
)
</script>

<template>
  <div class="diary-home">
    <PageHeader title="日记" :icon="BookOpen" />
    <div class="diary-layout">
      <div class="diary-main">
        <DiaryCalendarMonth
          :entries="entries"
          :selectedDate="selectedDate"
          :year="year"
          :month="month"
          @select="selectDay"
          @prevMonth="prevMonth"
          @nextMonth="nextMonth"
        />
        <div v-if="loading" class="diary-loading">加载中...</div>
        <DiaryCard
          v-else-if="hasContent"
          :entry="entry"
          :date="selectedDate"
          @save="saveUserText"
          @regenerate="doRegenerate"
        />
        <DiaryRegenerateBtn
          v-else
          :date="selectedDate"
          @regenerate="doRegenerate"
        />
      </div>
      <div class="diary-sidebar">
        <div class="diary-sidebar-header">
          <Clock :size="16" />
          <span>往年今日</span>
        </div>
        <div v-if="onThisDayItems.length === 0" class="diary-sidebar-empty">暂无往年今日</div>
        <OnThisDayCard
          v-for="item in onThisDayItems"
          :key="item.year"
          :item="item"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.diary-home {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1.25rem;
  gap: 1rem;
}

.diary-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 1.25rem;
  flex: 1;
  overflow: hidden;
}

.diary-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.diary-sidebar {
  border: 2px solid var(--nb-border);
  border-radius: 0.75rem;
  padding: 1rem;
  background: var(--nb-background);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.diary-sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.diary-sidebar-empty {
  font-size: 0.8rem;
  color: var(--nb-text-secondary);
  text-align: center;
  padding: 1rem;
}

.diary-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--nb-text-secondary);
  font-size: 0.85rem;
}
</style>