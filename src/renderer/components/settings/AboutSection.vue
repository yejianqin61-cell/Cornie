<script setup>
import SettingsSection from './SettingsSection.vue'
</script>

<template>
  <SettingsSection title="关于 Cornie" description="桌面AI伴侣">
    <div class="about-info">
      <div class="about-row">
        <span>版本</span>
        <span>v0.1.0</span>
      </div>
      <div class="about-row">
        <span>框架</span>
        <span>Electron + Vue 3 + Vite</span>
      </div>
      <div class="about-row">
        <span>AI 模型</span>
        <span>DeepSeek</span>
      </div>
    </div>
  </SettingsSection>
</template>

<style scoped>
.about-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.about-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--nb-border);
}

.about-row:last-child {
  border-bottom: none;
}

.about-row span:first-child {
  color: var(--nb-text-secondary);
}
</style>