<script setup>
import DiaryCalendarMonth from './DiaryCalendarMonth.vue'
import DiaryCard from './DiaryCard.vue'
import OnThisDayCard from './OnThisDayCard.vue'
import DiaryRegenerateBtn from './DiaryRegenerateBtn.vue'
import PageHeader from '../common/PageHeader.vue'
import { ref, computed, watch } from 'vue'
import { BookOpen, Clock, RefreshCw } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'
import { listEntries, getEntry, upsertEntry, regenerateCornie, getOnThisDay } from '../../api/diary.js'

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const selectedDate = ref(now.toISOString().slice(0, 10))
const entries = ref([])
const entry = ref(null)
const onThisDayItems = ref([])
const loading = ref(false)
const entryError = ref('')
const monthError = ref('')
const regening = ref(false)

const monthKey = computed(() => `${year.value}-${String(month.value).padStart(2, '0')}`)

function toYearMonth(dateStr) {
  const [y, m] = dateStr.split('-')
  return { year: Number(y), month: Number(m) }
}

async function fetchMonth() {
  monthError.value = ''
  try {
    const res = await listEntries({ month: monthKey.value })
    entries.value = (res.entries || []).map((e) => ({ ...e, date: e.date }))
  } catch (e) {
    monthError.value = e.message || '加载失败'
    entries.value = []
  }
}

async function fetchEntry() {
  loading.value = true
  entryError.value = ''
  try {
    const res = await getEntry(selectedDate.value)
    entry.value = res.entry
  } catch (e) {
    entry.value = null
    entryError.value = e.message || '加载失败'
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
  if (month.value === 1) { year.value--; month.value = 12 } else { month.value-- }
}

function nextMonth() {
  if (month.value === 12) { year.value++; month.value = 1 } else { month.value++ }
}

async function saveUserText(text) {
  try {
    const res = await upsertEntry(selectedDate.value, { userText: text })
    entry.value = res.entry
    fetchMonth()
  } catch { /* ignore */ }
}

async function doRegenerate() {
  regening.value = true
  try {
    const res = await regenerateCornie(selectedDate.value)
    entry.value = res.entry
  } catch { /* ignore */ }
  regening.value = false
}

const hasContent = computed(() => entry.value && (entry.value.userText || entry.value.cornieText))
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
        <div v-if="monthError" class="diary-banner diary-banner--error">
          <span>{{ monthError }}</span>
          <Button variant="neutral" size="sm" @click="fetchMonth">
            <RefreshCw :size="12" /> 重试
          </Button>
        </div>
        <div v-if="loading" class="diary-skeleton">
          <div class="diary-skeleton-line" v-for="n in 4" :key="n" />
        </div>
        <div v-else-if="entryError" class="diary-banner diary-banner--error">
          <span>{{ entryError }}</span>
          <Button variant="neutral" size="sm" @click="fetchEntry">
            <RefreshCw :size="12" /> 重试
          </Button>
        </div>
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
          :regenerating="regening"
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

.diary-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border: 2px solid #000;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.diary-banner--error {
  background: #fff0f0;
  color: var(--nb-danger, #d32f2f);
}

.diary-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
}

.diary-skeleton-line {
  height: 18px;
  border-radius: 0.25rem;
  background: var(--nb-border);
  animation: pulse 1.5s infinite;
}

.diary-skeleton-line:nth-child(odd) { width: 80%; }
.diary-skeleton-line:nth-child(even) { width: 60%; }

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>