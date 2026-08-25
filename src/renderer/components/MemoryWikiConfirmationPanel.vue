<script setup>
import ConfirmCard from './ConfirmCard.vue'

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
  <section class="workspaceCard span2">
    <div class="cardHead">
      <div>
        <div class="cardTitle">高风险确认中心</div>
      </div>
      <div class="cardFilters">
        <select :value="filterStatus" @change="handleStatusChange">
          <option value="">全部状态</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
        </select>
      </div>
    </div>

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
    <div v-else class="emptyDetail">现在没有排队等你点头的高风险动作，小铃湾先乖乖看着。</div>
  </section>
</template>

<style scoped>
.workspaceCard {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
.span2 {
  grid-column: 1 / -1;
}
.cardHead {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.cardTitle {
  font-weight: 800;
  font-size: 16px;
}
.cardSubhint {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}
.cardFilters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.queueSummary {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
  color: var(--muted);
  font-size: 13px;
}
.confirmGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}
.emptyDetail {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  padding: 16px;
  color: var(--muted);
  display: grid;
  place-items: center;
  min-height: 180px;
  text-align: center;
  line-height: 1.6;
}
@media (max-width: 720px) {
  .cardHead {
    flex-direction: column;
  }
}
</style>
