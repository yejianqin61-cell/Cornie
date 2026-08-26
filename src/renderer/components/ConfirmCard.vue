<script setup>
import { computed } from 'vue'
import UiButton from './ui/UiButton.vue'

const props = defineProps({
  request: {
    type: Object,
    default: () => ({}),
  },
  status: {
    type: String,
    default: 'pending',
  },
  errorMessage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['confirm', 'reject'])

function getTitle(request) {
  if (request?.title) return request.title
  if (request?.kind === 'category_creation_confirmation') return '确认新建这个类目'
  if (request?.kind === 'category_mapping_confirmation') return '确认改用这个类目'
  if (request?.tool_name) return `继续执行 ${request.tool_name}？`
  if (request?.toolName) return `继续执行 ${request.toolName}？`
  return '需要你确认'
}

function getReason(request) {
  return request?.reason || '需要你确认后继续'
}

function getDetails(request) {
  if (Array.isArray(request?.details) && request.details.length > 0) {
    return request.details
  }

  if (request?.kind === 'category_creation_confirmation') {
    return [
      `所属领域：${request.domain || '未提供'}`,
      `建议类目：${request.proposedCategoryName || '未提供'}`,
      `触发动作：${request.pendingAction?.toolName || request.toolName || '未提供'}`,
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
      `触发动作：${request.pendingAction?.toolName || request.toolName || '未提供'}`,
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
  if (props.status === 'failed') return '执行失败'
  if (props.status === 'processing') return '处理中'
  return '待确认'
})
</script>

<template>
  <div class="confirmCard">
    <div class="confirmTopline">
      <div class="confirmEyebrow">需要你确认</div>
      <div class="confirmStatusPill" :class="`is-${props.status || 'pending'}`">{{ statusLabel }}</div>
    </div>
    <div class="confirmTitle">{{ getTitle(props.request) }}</div>
    <div class="confirmReason">{{ getReason(props.request) }}</div>

    <div v-if="getDetails(props.request).length > 0" class="confirmDetails">
      <div v-for="item in getDetails(props.request)" :key="item" class="confirmDetail">{{ item }}</div>
    </div>

    <div v-if="props.errorMessage" class="confirmError">{{ props.errorMessage }}</div>

    <div class="confirmActions">
      <UiButton
        type="button"
        variant="default"
        class="confirmBtn confirmBtnPrimary"
        :disabled="props.status !== 'pending'"
        @click="emit('confirm', props.request)"
      >
        {{ props.status === 'processing' ? '处理中' : '同意' }}
      </UiButton>
      <UiButton
        type="button"
        variant="ghost"
        class="confirmBtn"
        :disabled="props.status !== 'pending'"
        @click="emit('reject', props.request)"
      >
        先不要
      </UiButton>
    </div>
  </div>
</template>

<style scoped>
.confirmCard {
  width: 100%;
  padding: 14px;
  border-radius: var(--radius-lg);
  background: var(--warning-soft);
}

.confirmTopline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.confirmEyebrow {
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  color: color-mix(in srgb, var(--color-warning) 60%, var(--color-text));
}

.confirmStatusPill {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font-size: var(--text-xs);
  white-space: nowrap;
}

.confirmStatusPill.is-approved {
  background: var(--success-soft);
  color: var(--success);
}

.confirmStatusPill.is-rejected,
.confirmStatusPill.is-failed {
  background: var(--danger-soft);
  color: var(--danger);
}

.confirmStatusPill.is-processing {
  background: var(--surface);
  color: color-mix(in srgb, var(--color-warning) 60%, var(--color-text));
}

.confirmTitle {
  margin-top: 6px;
  font-size: var(--text-md);
  font-weight: 700;
  color: var(--text);
}

.confirmReason {
  margin-top: 6px;
  font-size: var(--text-base);
  line-height: 1.5;
  color: color-mix(in srgb, var(--color-warning) 40%, var(--color-text));
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.confirmDetails {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.confirmDetail {
  font-size: var(--text-xs);
  color: var(--muted);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.confirmError {
  margin-top: 8px;
  font-size: var(--text-xs);
  color: var(--danger);
}

.confirmActions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.confirmBtn {
  flex: 1 1 0;
}
</style>
