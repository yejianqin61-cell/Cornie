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
  if (request?.kind === 'category_creation_confirmation') return '需要确认：新增类目'
  if (request?.kind === 'category_mapping_confirmation') return '需要确认：改用已有类目'
  if (request?.tool_name) return `需要确认：${request.tool_name}`
  if (request?.toolName) return `需要确认：${request.toolName}`
  return '需要你确认一下'
}

function getReason(request) {
  return request?.reason || '这个动作需要先征求你的同意。'
}

function getDetails(request) {
  if (Array.isArray(request?.details) && request.details.length > 0) {
    return request.details
  }

  if (request?.kind === 'category_creation_confirmation') {
    return [
      `所属域：${request.domain || '未提供'}`,
      `建议类目：${request.proposedCategoryName || '未提供'}`,
      `触发工具：${request.pendingAction?.toolName || request.toolName || '未提供'}`
    ]
  }

  if (request?.kind === 'category_mapping_confirmation') {
    const candidates = Array.isArray(request?.similarCandidates)
      ? request.similarCandidates.map((item) => item?.name).filter(Boolean)
      : []
    return [
      `所属域：${request.domain || '未提供'}`,
      `推荐类目：${request.recommendedCategory?.name || '未提供'}`,
      candidates.length > 0 ? `可选候选：${candidates.join('、')}` : null,
      `触发工具：${request.pendingAction?.toolName || request.toolName || '未提供'}`
    ].filter(Boolean)
  }

  const payload = request?.payload || request?.arguments
  if (payload && typeof payload === 'object') {
    return Object.entries(payload).map(([key, value]) => `${key}：${String(value)}`)
  }
  return []
}

const statusLabel = computed(() => {
  if (props.status === 'approved') return '已同意'
  if (props.status === 'rejected') return '已拒绝'
  if (props.status === 'failed') return '处理失败'
  if (props.status === 'processing') return '处理中'
  return '等待你的决定'
})
</script>

<template>
  <div class="confirmCard">
    <div class="confirmTopline">
      <div class="confirmEyebrow">高风险确认</div>
      <div class="confirmStatusPill" :class="`is-${props.status || 'pending'}`">{{ statusLabel }}</div>
    </div>
    <div class="confirmTitle">{{ getTitle(props.request) }}</div>
    <div class="confirmReason">{{ getReason(props.request) }}</div>

    <div v-if="getDetails(props.request).length > 0" class="confirmDetails">
      <div v-for="item in getDetails(props.request)" :key="item" class="confirmDetail">{{ item }}</div>
    </div>

    <div v-if="props.errorMessage" class="confirmError">{{ props.errorMessage }}</div>
    <div v-if="props.status === 'approved'" class="confirmState">已同意，正在继续处理。</div>
    <div v-else-if="props.status === 'rejected'" class="confirmState">已拒绝，本次不会执行。</div>
    <div v-else-if="props.status === 'failed'" class="confirmState">处理失败，可以稍后重试。</div>
    <div v-else-if="props.status === 'processing'" class="confirmState">小铃湾正在继续处理...</div>

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
        拒绝
      </button>
    </div>
  </div>
</template>

<style scoped>
.confirmCard{
  width: 100%;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(251,191,36,.28);
  background: linear-gradient(180deg, rgba(120,53,15,.30), rgba(17,24,39,.78));
}

.confirmTopline{
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 8px;
}

.confirmEyebrow{
  font-size: 10px;
  letter-spacing: .08em;
  color: rgba(253,224,71,.76);
}

.confirmStatusPill{
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.80);
  font-size: 10px;
  white-space: nowrap;
}
.confirmStatusPill.is-approved{
  border-color: rgba(74,222,128,.30);
  background: rgba(74,222,128,.12);
  color: rgba(220,252,231,.92);
}
.confirmStatusPill.is-rejected{
  border-color: rgba(248,113,113,.30);
  background: rgba(248,113,113,.12);
  color: rgba(254,226,226,.92);
}
.confirmStatusPill.is-failed{
  border-color: rgba(248,113,113,.30);
  background: rgba(127,29,29,.28);
  color: rgba(254,226,226,.92);
}
.confirmStatusPill.is-processing{
  border-color: rgba(125,211,252,.30);
  background: rgba(125,211,252,.12);
  color: rgba(224,242,254,.92);
}

.confirmTitle{
  margin-top: 6px;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,251,235,.96);
}

.confirmReason{
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(254,243,199,.88);
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
  color: rgba(255,255,255,.72);
  white-space: pre-wrap;
  word-break: break-word;
}

.confirmError{
  margin-top: 8px;
  font-size: 11px;
  color: rgba(254,202,202,.92);
}

.confirmState{
  margin-top: 8px;
  font-size: 11px;
  color: rgba(255,255,255,.72);
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
  border: 1px solid rgba(255,255,255,.16);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.88);
  font-size: 12px;
  cursor: pointer;
}

.confirmBtnPrimary{
  border-color: rgba(253,224,71,.30);
  background: rgba(250,204,21,.18);
}

.confirmBtn:disabled{
  opacity: .55;
  cursor: not-allowed;
}
</style>
