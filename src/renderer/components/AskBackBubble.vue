<script setup>
const props = defineProps({
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
  border-radius: 14px;
  border: 1px solid rgba(232, 133, 106, 0.25);
  background: rgba(232, 133, 106, 0.06);
}

.askBackRole {
  font-size: 10px;
  color: var(--muted);
}

.askBackQuestion {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.askBackReason {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.askBackReasonLabel {
  color: inherit;
}
</style>
