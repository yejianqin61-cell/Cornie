<script setup>
const props = defineProps({
  monthLabel: {
    type: String,
    default: '',
  },
  weekdayLabels: {
    type: Array,
    default: () => [],
  },
  cells: {
    type: Array,
    default: () => [],
  },
  selectedDate: {
    type: String,
    default: '',
  },
  todayDate: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['prev-month', 'next-month', 'select-date'])

function cellClasses(cell) {
  return {
    isMuted: !cell.inMonth,
    isToday: cell.date === props.todayDate,
    isSelected: cell.date === props.selectedDate,
    hasExpense: cell.expense > 0,
    hasIncome: cell.income > 0,
  }
}
</script>

<template>
  <div class="ledgerCalendar card">
    <div class="ledgerCalendarHead">
      <button class="ghost calendarNav" type="button" @click="emit('prev-month')">上个月</button>
      <div class="calendarTitle">{{ monthLabel }}</div>
      <button class="ghost calendarNav" type="button" @click="emit('next-month')">下个月</button>
    </div>

    <div class="calendarWeekdays">
      <div v-for="label in weekdayLabels" :key="label" class="calendarWeekday">{{ label }}</div>
    </div>

    <div class="calendarGrid">
      <button
        v-for="cell in cells"
        :key="cell.date"
        class="calendarCell"
        :class="cellClasses(cell)"
        type="button"
        @click="emit('select-date', cell.date)"
      >
        <span class="calendarDay">{{ cell.day }}</span>
        <span v-if="cell.expense > 0 || cell.income > 0" class="calendarDots">
          <span v-if="cell.expense > 0" class="calendarDot expense"></span>
          <span v-if="cell.income > 0" class="calendarDot income"></span>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ledgerCalendar {
  padding: 14px 16px;
  background: var(--color-surface);
}

.ledgerCalendarHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.calendarTitle {
  font-size: var(--text-md);
  font-weight: 700;
  color: var(--text);
}

.calendarNav {
  padding: 6px 10px;
  border-radius: 999px;
  color: var(--muted);
}

.calendarWeekdays {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.calendarWeekday {
  text-align: center;
  font-size: var(--text-xs);
  color: var(--muted);
}

.calendarGrid {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.calendarCell {
  min-height: 46px;
  border: none;
  border-radius: 14px;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 0;
  color: var(--text);
}

.calendarCell:hover {
  background: color-mix(in srgb, var(--color-text) 4%, transparent);
}

.calendarCell.isMuted {
  color: color-mix(in srgb, var(--color-text) 35%, transparent);
}

.calendarCell.isToday {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-success) 22%, transparent);
  background: color-mix(in srgb, var(--color-success) 7%, transparent);
}

.calendarCell.isSelected {
  background: var(--success-soft);
  color: var(--text);
}

.calendarDay {
  font-size: var(--text-base);
  line-height: 1;
}

.calendarDots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.calendarDot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
}

.calendarDot.expense {
  background: var(--danger);
}

.calendarDot.income {
  background: var(--success);
}
</style>
