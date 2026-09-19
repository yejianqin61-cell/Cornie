<script setup>
defineProps({ text: { type: String, required: true } })
</script>

<template>
  <div class="cornie-bubble">
    <span class="cornie-bubble-text">{{ text }}</span>
  </div>
</template>

<style scoped>
.cornie-bubble {
  position: absolute;
  top: -54px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.92);
  border: 1.5px solid rgba(100, 120, 160, 0.3);
  border-radius: 12px;
  padding: 6px 14px;
  max-width: 240px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  z-index: 20;
  animation: bubble-in 0.3s ease-out;
}
.cornie-bubble-text {
  font-size: 13px;
  font-weight: 600;
  color: #2d2d5e;
  font-family: sans-serif;
}
@keyframes bubble-in {
  from { opacity: 0; transform: translateX(-50%) translateY(6px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>