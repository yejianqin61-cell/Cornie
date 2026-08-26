<script setup>
import ConfirmCard from './ConfirmCard.vue'
import UiCard from './ui/UiCard.vue'
import UiEmpty from './ui/UiEmpty.vue'

const props = defineProps({
  confirmations: { type: Array, default: () => [] },
  filterStatus: { type: String, default: 'pending' },
  pendingCount: { type: Number, default: 0 },
  statusMap: { type: Object, default: () => ({}) },
  errorMap: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['confirm', 'reject', 'change', 'update:filterStatus'])

function resolveConfirmationState(confirmation) {
  return props.statusMap[confirmation.id] || confirmation.status || 'pending'
}

function handleStatusChange(event) {
  emit('update:filterStatus', event.target.value)
  emit('change')
}
</script>

<template>
  <UiCard class="span2" title="高风险确认中心">
    <template #actions>
      <div class="cardFilters">
        <select :value="filterStatus" @change="handleStatusChange">
          <option value="">全部状态</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
        </select>
      </div>
    </template>

    <div class="queueSummary">
      当前待确认 <strong>{{ pendingCount }}</strong> 项
    </div>

    <div v-if="confirmations.length > 0" class="confirmGrid">
      <ConfirmCard
        v-for="confirmation in confirmations"
        :key="confirmation.id"
        :request="confirmation.confirmRequest || {}"
        :status="resolveConfirmationState(confirmation)"
        :error-message="errorMap[confirmation.id] || ''"
        @confirm="emit('confirm', confirmation)"
        @reject="emit('reject', confirmation)"
      />
    </div>
    <UiEmpty v-else icon="🛡️" text="暂无待确认动作" />
  </UiCard>
</template>

<style scoped>
.span2 {
  grid-column: 1 / -1;
}
.cardFilters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.queueSummary {
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: var(--text-base);
}
.confirmGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}
</style>
