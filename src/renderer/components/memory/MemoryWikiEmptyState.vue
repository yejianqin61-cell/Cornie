<script setup>
import { Brain } from '@lucide/vue'
import EmptyState from '../common/EmptyState.vue'
</script>

<template>
  <div class="mw-empty">
    <EmptyState :icon="Brain" text="暂无记忆页面" />
  </div>
</template>

<style scoped>
.mw-empty { padding: 2rem 1rem; }
</style>