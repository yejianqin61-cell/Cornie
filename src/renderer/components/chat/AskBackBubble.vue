<script setup>
import { HelpCircle } from '@lucide/vue'

defineProps({
  text: { type: String, required: true },
  onReply: { type: Function, default: null },
})
</script>

<template>
  <div class="askback-bubble">
    <div class="askback-icon-wrap">
      <HelpCircle :size="14" />
    </div>
    <p class="askback-text">{{ text }}</p>
    <button v-if="onReply" class="askback-action" @click="onReply">
      回答
    </button>
  </div>
</template>

<style scoped>
.askback-bubble {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #fff3cd;
  border: 2px solid #000;
  box-shadow: 3px 3px 0 0 #000;
  max-width: 400px;
}

.askback-icon-wrap {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffd100;
  border: 2px solid #000;
}

.askback-text {
  margin: 0;
  flex: 1;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
}

.askback-action {
  padding: 4px 10px;
  border: 2px solid #000;
  background: #fff;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 2px 2px 0 0 #000;
  flex-shrink: 0;
}

.askback-action:hover {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 0 #000;
}
</style>