<script setup>
import { Calendar } from '@lucide/vue'
import EmptyState from '../common/EmptyState.vue'
</script>

<template>
  <div class="sch-empty">
    <EmptyState :icon="Calendar" text="暂无日程安排" />
  </div>
</template>

<style scoped>
.sch-empty { padding: 2rem 1rem; }
</style>