<script setup>
import { Settings } from '@lucide/vue'
import PageHeader from '../common/PageHeader.vue'
import ModelSettings from './ModelSettings.vue'
import AboutSection from './AboutSection.vue'
</script>

<template>
  <div class="settings-page">
    <PageHeader title="设置" :icon="Settings" />
    <div class="settings-content">
      <ModelSettings />
      <AboutSection />
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  gap: 1rem;
  height: 100%;
  overflow-y: auto;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>