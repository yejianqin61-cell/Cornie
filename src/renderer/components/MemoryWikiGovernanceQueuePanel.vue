<script setup>
import UiCard from './ui/UiCard.vue'
import UiEmpty from './ui/UiEmpty.vue'

defineProps({
  governanceItems: { type: Array, default: () => [] },
  selectedGovernanceId: { type: String, default: '' },
  filterStatus: { type: String, default: 'pending' },
  filterSection: { type: String, default: '' },
  sections: { type: Array, default: () => [] },
  pendingCount: { type: Number, default: 0 },
  filterSummary: { type: String, default: '' },
})

const emit = defineEmits(['select-governance', 'change', 'update:filterStatus', 'update:filterSection'])

function handleStatusChange(event) {
  emit('update:filterStatus', event.target.value)
  emit('change')
}

function handleSectionChange(event) {
  emit('update:filterSection', event.target.value)
  emit('change')
}
</script>

<template>
  <UiCard title="治理待审核区">
    <template #actions>
      <div class="cardFilters">
        <select :value="filterStatus" @change="handleStatusChange">
          <option value="">全部状态</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
          <option value="deferred">deferred</option>
        </select>
        <select :value="filterSection" @change="handleSectionChange">
          <option value="">全部分区</option>
          <option v-for="section in sections" :key="section" :value="section">{{ section }}</option>
        </select>
      </div>
    </template>

    <div class="queueSummary">
      当前待处理 <strong>{{ pendingCount }}</strong> 项
    </div>

    <div class="filterSummary">当前筛选：{{ filterSummary }}</div>

    <UiEmpty v-if="governanceItems.length === 0" icon="🧭" text="暂无治理建议" />

    <div v-else class="entryList">
      <button
        v-for="item in governanceItems"
        :key="item.requestId"
        class="entryRow"
        :class="{ active: item.requestId === selectedGovernanceId }"
        @click="emit('select-governance', item.requestId)"
      >
        <div>
          <div class="entryMain">{{ item.title || item.requestType }}</div>
          <div class="entryMeta">{{ item.queueSection }} · {{ item.status }} · {{ item.riskLevel }}</div>
        </div>
      </button>
    </div>
  </UiCard>
</template>

<style scoped>
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
.filterSummary {
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--color-info-soft);
  color: var(--text);
  font-size: var(--text-base);
}
.entryList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}
.entryRow {
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
}
.entryRow.active {
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}
.entryMain {
  font-weight: 700;
}
.entryMeta {
  margin-top: 4px;
  font-size: var(--text-sm);
  color: var(--muted);
}
</style>
