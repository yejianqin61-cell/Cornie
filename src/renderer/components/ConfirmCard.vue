<script setup>
import { computed } from 'vue'

const props = defineProps({
  request: {
    type: Object,
    default: () => ({})
  },
  status: {
    type: String,
    default: 'pending'
  },
  errorMessage: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['confirm', 'reject'])

function getTitle(request) {
  if (request?.title) return request.title
  if (request?.kind === 'category_creation_confirmation') return '铃湾想先和你确认一下这个新类目'
  if (request?.kind === 'category_mapping_confirmation') return '铃湾想先确认要不要改用这个类目'
  if (request?.tool_name) return `这一步要不要继续处理 ${request.tool_name}？`
  if (request?.toolName) return `这一步要不要继续处理 ${request.toolName}？`
  return '这一步需要你点个头'
}

function getReason(request) {
  return request?.reason || '这件事继续做下去之前，铃湾想先征求你的同意。'
}

function getDetails(request) {
  if (Array.isArray(request?.details) && request.details.length > 0) {
    return request.details
  }

  if (request?.kind === 'category_creation_confirmation') {
    return [
      `所属领域：${request.domain || '未提供'}`,
      `建议类目：${request.proposedCategoryName || '未提供'}`,
      `触发动作：${request.pendingAction?.toolName || request.toolName || '未提供'}`
    ]
  }

  if (request?.kind === 'category_mapping_confirmation') {
    const candidates = Array.isArray(request?.similarCandidates)
      ? request.similarCandidates.map((item) => item?.name).filter(Boolean)
      : []
    return [
      `所属领域：${request.domain || '未提供'}`,
      `推荐类目：${request.recommendedCategory?.name || '未提供'}`,
      candidates.length > 0 ? `可选候选：${candidates.join('、')}` : null,
      `触发动作：${request.pendingAction?.toolName || request.toolName || '未提供'}`
    ].filter(Boolean)
  }

  const payload = request?.payload || request?.arguments
  if (payload && typeof payload === 'object') {
    return Object.entries(payload).map(([key, value]) => `${key}：${String(value)}`)
  }
  return []
}

const statusLabel = computed(() => {
  if (props.status === 'approved') return '你已经同意啦'
  if (props.status === 'rejected') return '这次先不做'
  if (props.status === 'failed') return '这次没继续成功'
  if (props.status === 'processing') return '铃湾正在继续处理'
  return '等你来决定'
})
</script>

<template>
  <div class="confirmCard">
    <div class="confirmTopline">
      <div class="confirmEyebrow">需要你点头</div>
      <div class="confirmStatusPill" :class="`is-${props.status || 'pending'}`">{{ statusLabel }}</div>
    </div>
    <div class="confirmTitle">{{ getTitle(props.request) }}</div>
    <div class="confirmReason">{{ getReason(props.request) }}</div>

    <div v-if="getDetails(props.request).length > 0" class="confirmDetails">
      <div v-for="item in getDetails(props.request)" :key="item" class="confirmDetail">{{ item }}</div>
    </div>

    <div v-if="props.errorMessage" class="confirmError">{{ props.errorMessage }}</div>
    <div v-if="props.status === 'approved'" class="confirmState">铃湾已经收到你的同意，正在继续做下去。</div>
    <div v-else-if="props.status === 'rejected'" class="confirmState">这次就先停在这里，不会继续执行。</div>
    <div v-else-if="props.status === 'failed'" class="confirmState">继续处理的时候出了点小岔子，可以稍后再试。</div>
    <div v-else-if="props.status === 'processing'" class="confirmState">铃湾正在顺着你的选择继续处理...</div>

    <div class="confirmActions">
      <button
        type="button"
        class="confirmBtn confirmBtnPrimary"
        :disabled="props.status !== 'pending'"
        @click="emit('confirm', props.request)"
      >
        {{ props.status === 'processing' ? '处理中' : '同意' }}
      </button>
      <button
        type="button"
        class="confirmBtn"
        :disabled="props.status !== 'pending'"
        @click="emit('reject', props.request)"
      >
        先不要
      </button>
    </div>
  </div>
</template>

<style scoped>
.confirmCard{
  width: 100%;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(228,163,94,.24);
  background: var(--warning-soft);
}

.confirmTopline{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.confirmEyebrow{
  font-size: 11px;
  letter-spacing: .08em;
  color: #B5783F;
}

.confirmStatusPill{
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,.08);
  background: rgba(255,255,255,.72);
  color: var(--text);
  font-size: 10px;
  white-space: nowrap;
}

.confirmStatusPill.is-approved{
  border-color: rgba(91,154,107,.22);
  background: var(--success-soft);
  color: var(--success);
}

.confirmStatusPill.is-rejected,
.confirmStatusPill.is-failed{
  border-color: rgba(217,106,92,.20);
  background: var(--danger-soft);
  color: var(--danger);
}

.confirmStatusPill.is-processing{
  border-color: rgba(228,163,94,.24);
  background: rgba(255,255,255,.78);
  color: #9B6A36;
}

.confirmTitle{
  margin-top: 6px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.confirmReason{
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: #6C5648;
  white-space: pre-wrap;
  word-break: break-word;
}

.confirmDetails{
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.confirmDetail{
  font-size: 11px;
  color: var(--muted);
  white-space: pre-wrap;
  word-break: break-word;
}

.confirmError{
  margin-top: 8px;
  font-size: 11px;
  color: var(--danger);
}

.confirmState{
  margin-top: 8px;
  font-size: 11px;
  color: #866955;
}

.confirmActions{
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.confirmBtn{
  flex: 1 1 0;
  height: 30px;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,.08);
  background: rgba(255,255,255,.72);
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
}

.confirmBtnPrimary{
  border-color: rgba(228,133,106,.18);
  background: rgba(232,133,106,.16);
}

.confirmBtn:disabled{
  opacity: .55;
  cursor: not-allowed;
}
</style>
