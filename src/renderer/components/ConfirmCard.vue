<script setup>
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
  const payload = request?.payload || request?.arguments
  if (payload && typeof payload === 'object') {
    return Object.entries(payload).map(([key, value]) => `${key}：${String(value)}`)
  }
  return []
}
</script>

<template>
  <div class="confirmCard">
    <div class="confirmEyebrow">待确认操作</div>
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
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(251,191,36,.28);
  background: linear-gradient(180deg, rgba(120,53,15,.30), rgba(17,24,39,.78));
}

.confirmEyebrow{
  font-size: 10px;
  letter-spacing: .08em;
  color: rgba(253,224,71,.76);
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
