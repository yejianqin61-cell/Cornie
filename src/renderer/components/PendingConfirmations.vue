<script setup>
import { onMounted, ref } from 'vue'
import { listConfirmations, submitConfirmationDecision } from '../api'
import { today } from '../utils/date'

const confirmations = ref([])
const loading = ref(false)
const processingId = ref(null)
const errorMsg = ref('')

// Only keep the 4 allowed confirmation types for normal users
const ALLOWED_TYPES = ['category_create', 'high_risk_delete', 'overwrite', 'high_risk_memory_write']

function filterAllowed(items) {
  return (items || []).filter((item) => {
    // If confirm type is explicitly in allowed list, show it
    if (ALLOWED_TYPES.includes(item.confirmType)) return true
    // If confirm type is unknown, show it anyway (don't accidentally hide something critical)
    if (!item.confirmType) return true
    return false
  }).filter((item) => item.status === 'pending')
}

async function refresh() {
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await listConfirmations({ status: 'pending' })
    confirmations.value = filterAllowed(data?.confirmations || [])
  } catch (error) {
    errorMsg.value = error?.message || '加载确认事项失败。'
  } finally {
    loading.value = false
  }
}

async function handleAction(id, action) {
  processingId.value = id
  try {
    await submitConfirmationDecision(id, action === 'confirm' ? 'approve' : 'reject')
    // Remove from local list after processing
    confirmations.value = confirmations.value.filter((c) => c.id !== id)
  } catch (error) {
    errorMsg.value = error?.message || '处理确认失败，请稍后再试。'
  } finally {
    processingId.value = null
  }
}

function friendlyTitle(item) {
  if (item.confirmRequest?.title) return item.confirmRequest.title
  if (item.confirmType === 'category_create') return '新建类目确认'
  if (item.confirmType === 'high_risk_delete') return '删除确认'
  if (item.confirmType === 'overwrite') return '覆盖确认'
  if (item.confirmType === 'high_risk_memory_write') return '记忆写入确认'
  return '待确认事项'
}

function friendlyDescription(item) {
  if (item.confirmRequest?.description) return item.confirmRequest.description
  return item.assistantReply || '铃湾需要你确认这个操作。'
}

onMounted(refresh)
</script>

<template>
  <div class="pending">
    <header class="pendingHead">
      <div>
        <div class="pendingTitle">待确认事项</div>
        <div class="pendingHint">只有需要你决定的重要事项才会出现在这里</div>
      </div>
      <button class="ghost" :disabled="loading" @click="refresh">
        {{ loading ? '刷新中…' : '刷新' }}
      </button>
    </header>

    <div v-if="errorMsg" class="pendingError">{{ errorMsg }}</div>

    <div v-if="loading && confirmations.length === 0" class="pendingLoading">
      检查中…
    </div>

    <div v-else-if="confirmations.length === 0" class="pendingEmpty">
      <div class="pendingEmptyIcon">✨</div>
      <div class="pendingEmptyText">没有需要确认的事项</div>
    </div>

    <div v-else class="pendingList">
      <div
        v-for="item in confirmations"
        :key="item.id"
        class="pendingCard card"
      >
        <div class="pendingCardTitle">{{ friendlyTitle(item) }}</div>
        <div class="pendingCardDesc">{{ friendlyDescription(item) }}</div>
        <div class="pendingCardDate">{{ item.date }}</div>
        <div class="pendingCardActions">
          <button
            class="primary"
            :disabled="processingId === item.id"
            @click="handleAction(item.id, 'confirm')"
          >
            {{ processingId === item.id ? '处理中…' : '同意' }}
          </button>
          <button
            :disabled="processingId === item.id"
            @click="handleAction(item.id, 'reject')"
          >
            {{ processingId === item.id ? '处理中…' : '拒绝' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pending{
  height: 100%;
  display:flex;
  flex-direction:column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  overflow: hidden;
}

.pendingHead{
  display:flex;
  align-items:flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.pendingTitle{ font-size: 18px; font-weight: 800; }
.pendingHint{ margin-top: 4px; font-size: 13px; color: var(--muted); }

.pendingList{
  flex:1;
  overflow-y:auto;
  padding: 16px 20px;
  display:flex;
  flex-direction:column;
  gap: 12px;
}
.pendingList::-webkit-scrollbar{ width: 4px; }
.pendingList::-webkit-scrollbar-thumb{
  background: rgba(0,0,0,.10);
  border-radius: 999px;
}

.pendingCard{
  padding: 16px;
  display:flex;
  flex-direction:column;
  gap: 8px;
}
.pendingCardTitle{ font-weight: 700; }
.pendingCardDesc{ font-size: 13px; color: var(--muted); line-height: 1.5; }
.pendingCardDate{ font-size: 12px; color: var(--muted); }
.pendingCardActions{
  display:flex;
  gap: 10px;
  margin-top: 4px;
}

.pendingLoading,
.pendingEmpty,
.pendingError{
  margin: 20px;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
}
.pendingLoading{ color: var(--muted); }
.pendingEmpty{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap: 8px;
}
.pendingEmptyIcon{ font-size: 32px; }
.pendingEmptyText{ color: var(--muted); font-size: 14px; }
.pendingError{
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger);
}
</style>
