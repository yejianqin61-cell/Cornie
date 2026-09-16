<script setup>
import { Eye } from '@lucide/vue'
import EmptyState from '../common/EmptyState.vue'
</script>

<template>
  <div class="obs-empty">
    <EmptyState :icon="Eye" text="暂无观察记录" />
  </div>
</template>

<style scoped>
.obs-empty { padding: 2rem 1rem; }
</style>