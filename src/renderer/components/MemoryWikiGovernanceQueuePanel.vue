<script setup>
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
  <section class="workspaceCard">
    <div class="cardHead">
      <div>
        <div class="cardTitle">治理待审核区</div>
      </div>
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
    </div>

    <div class="queueSummary">
      当前待处理 <strong>{{ pendingCount }}</strong> 项
    </div>

    <div class="filterSummary">当前筛选：{{ filterSummary }}</div>

    <div v-if="governanceItems.length === 0" class="emptyDetail compactEmpty">
      现在没有新的治理建议。等巡检或整理过程发现问题，这里会再提醒你。
    </div>

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
.filterSummary {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px dashed rgba(125, 211, 252, 0.2);
  background: rgba(125, 211, 252, 0.06);
  color: rgba(224, 242, 254, 0.88);
  font-size: 13px;
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
  background: rgba(125, 211, 252, 0.12);
  border-color: rgba(125, 211, 252, 0.35);
}
.entryMain {
  font-weight: 700;
}
.entryMeta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
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
.compactEmpty {
  min-height: 120px;
}
@media (max-width: 720px) {
  .cardHead {
    flex-direction: column;
  }
}
</style>
