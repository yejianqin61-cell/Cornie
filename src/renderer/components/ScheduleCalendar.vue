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
    hasEntries: cell.hasEntries,
  }
}
</script>

<template>
  <div class="calendarCard card">
    <div class="calendarHead">
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
        <span v-if="cell.hasEntries" class="calendarDot"></span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.calendarCard {
  padding: 14px 16px;
  background: var(--color-surface);
}

.calendarHead {
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
  min-height: 44px;
  border-radius: var(--radius-lg);
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
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 26%, transparent);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
}

.calendarCell.isSelected {
  background: var(--accent);
  color: #ffffff;
}

.calendarCell.isSelected .calendarDot {
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
}

.calendarCell.hasEntries .calendarDay {
  font-weight: 700;
}

.calendarDay {
  font-size: var(--text-base);
  line-height: 1;
}

.calendarDot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--warning);
}
</style>
