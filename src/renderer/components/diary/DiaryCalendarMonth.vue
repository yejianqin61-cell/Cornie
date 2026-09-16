<script setup>
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'

const props = defineProps({
  entries: { type: Array, default: () => [] },
  selectedDate: { type: String, default: '' },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
})

const emit = defineEmits(['select', 'prevMonth', 'nextMonth'])

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const daysInMonth = new Date(props.year, props.month, 0).getDate()
const firstDayOfWeek = (new Date(props.year, props.month - 1, 1).getDay() + 6) % 7

const entryMap = new Map(props.entries.map((e) => [e.date, e]))

function isToday(dateStr) {
  return dateStr === new Date().toISOString().slice(0, 10)
}

function dayClasses(dateStr) {
  return {
    'diary-cal-day': true,
    'diary-cal-day--selected': dateStr === props.selectedDate,
    'diary-cal-day--today': isToday(dateStr),
    'diary-cal-day--has-entry': entryMap.has(dateStr),
  }
}
</script>

<template>
  <div class="diary-calendar">
    <div class="diary-cal-header">
      <Button variant="neutral" size="icon" @click="$emit('prevMonth')">
        <ChevronLeft :size="16" />
      </Button>
      <span class="diary-cal-title">{{ year }}年 {{ MONTH_NAMES[month - 1] }}</span>
      <Button variant="neutral" size="icon" @click="$emit('nextMonth')">
        <ChevronRight :size="16" />
      </Button>
    </div>
    <div class="diary-cal-grid">
      <div v-for="d in WEEKDAYS" :key="d" class="diary-cal-weekday">{{ d }}</div>
      <div v-for="i in firstDayOfWeek" :key="'pad-' + i" class="diary-cal-day diary-cal-day--pad" />
      <div
        v-for="d in daysInMonth"
        :key="d"
        :class="dayClasses(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)"
        @click="$emit('select', `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)"
      >
        {{ d }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.diary-calendar {
  border: 2px solid var(--nb-border);
  border-radius: 0.75rem;
  padding: 1rem;
  background: var(--nb-background);
}

.diary-cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.diary-cal-title {
  font-weight: 700;
  font-size: 0.95rem;
}

.diary-cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  text-align: center;
}

.diary-cal-weekday {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--nb-text-secondary);
  padding: 4px 0;
}

.diary-cal-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
}

.diary-cal-day:hover {
  background: var(--nb-hover);
}

.diary-cal-day--selected {
  background: var(--nb-accent);
  color: var(--nb-accent-foreground);
  font-weight: 700;
}

.diary-cal-day--today {
  box-shadow: inset 0 0 0 2px var(--nb-accent);
}

.diary-cal-day--has-entry {
  position: relative;
}

.diary-cal-day--has-entry::after {
  content: '';
  position: absolute;
  bottom: 3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--nb-accent);
}

.diary-cal-day--selected.diary-cal-day--has-entry::after {
  background: var(--nb-accent-foreground);
}

.diary-cal-day--pad {
  cursor: default;
}
</style>