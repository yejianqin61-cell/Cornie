<script setup>
defineProps({
  icon: { type: String, default: '📄' },
  text: { type: String, default: '这里还没有内容。' },
})
</script>

<template>
  <div class="uiEmpty">
    <div class="uiEmptyIcon">{{ icon }}</div>
    <div class="uiEmptyText">{{ text }}</div>
    <div v-if="$slots.action" class="uiEmptyAction">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.uiEmpty {
  padding: 14px 16px;
  border-radius: var(--radius-xl);
  border: 1px dashed var(--border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--muted);
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.uiEmptyIcon {
  font-size: var(--text-2xl);
}
.uiEmptyText {
  font-size: var(--text-base);
}
.uiEmptyAction {
  margin-top: 4px;
}
</style>
