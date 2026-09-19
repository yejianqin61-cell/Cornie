<script setup>
import { ref } from 'vue'

const props = defineProps({
  scale: { type: Number, default: 1 },
  alwaysOnTop: { type: Boolean, default: false },
})

const emit = defineEmits(['scale-change', 'toggle-always-on-top', 'close'])

const SCALES = [0.6, 0.8, 1, 1.2, 1.5]

function selectScale(s) {
  emit('scale-change', s)
}
</script>

<template>
  <div class="pet-settings-overlay" @click.self="$emit('close')">
    <div class="pet-settings">
      <div class="pet-settings-head">
        <span class="pet-settings-title">Cornie 设置</span>
        <button class="pet-settings-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="pet-settings-row">
        <span class="pet-settings-label">大小</span>
        <div class="pet-settings-scales">
          <button
            v-for="s in SCALES"
            :key="s"
            :class="['pet-settings-scale', { active: scale === s }]"
            @click="selectScale(s)"
          >
            {{ s }}x
          </button>
        </div>
      </div>
      <div class="pet-settings-row">
        <span class="pet-settings-label">置顶</span>
        <button
          :class="['pet-settings-toggle-btn', { on: alwaysOnTop }]"
          @click="$emit('toggle-always-on-top', !alwaysOnTop)"
        >
          <span class="pet-settings-toggle-knob" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pet-settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.pet-settings {
  background: rgba(255, 255, 255, 0.96);
  border: 1.5px solid rgba(100, 120, 160, 0.3);
  border-radius: 12px;
  padding: 16px;
  min-width: 200px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  font-family: sans-serif;
}
.pet-settings-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.pet-settings-title {
  font-size: 14px;
  font-weight: 700;
  color: #2d2d5e;
}
.pet-settings-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #888;
}
.pet-settings-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.pet-settings-label {
  font-size: 12px;
  font-weight: 600;
  color: #555;
}
.pet-settings-scales { display: flex; gap: 4px; }
.pet-settings-scale {
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  padding: 2px 6px;
  font-size: 11px;
  cursor: pointer;
  color: #555;
}
.pet-settings-scale.active {
  border-color: #5b6eea;
  background: #5b6eea;
  color: #fff;
}
.pet-settings-toggle-btn {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  border: 1px solid #ccc;
  background: #ddd;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
}
.pet-settings-toggle-btn.on { background: #5b6eea; border-color: #5b6eea; }
.pet-settings-toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
}
.pet-settings-toggle-btn.on .pet-settings-toggle-knob { left: 20px; }
</style>