<script setup>
defineProps({
  question: {
    type: String,
    default: '',
  },
  reason: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="askBackBubble">
    <div class="askBackRole">Cornie 还想确认一下</div>
    <div class="askBackQuestion">{{ props.question }}</div>
    <div v-if="props.reason" class="askBackReason">
      <span class="askBackReasonLabel">原因：</span>{{ props.reason }}
    </div>
  </div>
</template>

<style scoped>
/* FE-10：配色对齐全局暖色主题（原深蓝黑底为旧样式残留）。 */
.askBackBubble {
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-accent) 6%, transparent);
}

.askBackRole {
  font-size: var(--text-xs);
  color: var(--muted);
}

.askBackQuestion {
  margin-top: 4px;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.askBackReason {
  margin-top: 6px;
  font-size: var(--text-xs);
  line-height: 1.45;
  color: var(--muted);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.askBackReasonLabel {
  color: inherit;
}
</style>
