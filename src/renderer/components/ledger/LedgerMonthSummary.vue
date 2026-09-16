<script setup>
import { ArrowUp, ArrowDown } from '@lucide/vue'

defineProps({
  month: { type: String, default: '' },
  income: { type: Number, default: 0 },
  expense: { type: Number, default: 0 },
})
</script>

<template>
  <div class="month-summary">
    <h3 class="month-summary-title">{{ month }}</h3>
    <div class="month-summary-row month-summary-row--in">
      <ArrowUp :size="14" />
      <span class="month-summary-label">收入</span>
      <span class="month-summary-value">+{{ income.toFixed(2) }}</span>
    </div>
    <div class="month-summary-row month-summary-row--out">
      <ArrowDown :size="14" />
      <span class="month-summary-label">支出</span>
      <span class="month-summary-value">-{{ expense.toFixed(2) }}</span>
    </div>
    <div class="month-summary-divider"></div>
    <div class="month-summary-row month-summary-row--net">
      <span class="month-summary-label">结余</span>
      <span
        class="month-summary-value"
        :class="income - expense >= 0 ? 'month-summary-value--positive' : 'month-summary-value--negative'"
      >
        {{ income - expense >= 0 ? '+' : '' }}{{ (income - expense).toFixed(2) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.month-summary {
  background: #fff;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 0 #000;
  padding: 14px;
}

.month-summary-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 900;
  padding-bottom: 8px;
  border-bottom: 3px solid #000;
}

.month-summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}

.month-summary-label {
  font-size: 12px;
  font-weight: 700;
  color: #666;
  flex: 1;
}

.month-summary-value {
  font-size: 14px;
  font-weight: 900;
}

.month-summary-row--in .month-summary-value {
  color: #4a4;
}

.month-summary-row--out .month-summary-value {
  color: #d44;
}

.month-summary-divider {
  height: 3px;
  background: #000;
  margin: 4px 0;
}

.month-summary-row--net .month-summary-label {
  color: #000;
  font-weight: 900;
}

.month-summary-value--positive {
  color: #4a4;
}

.month-summary-value--negative {
  color: #d44;
}
</style>