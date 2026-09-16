<script setup>
import { BookOpen } from '@lucide/vue'
import EmptyState from '../common/EmptyState.vue'
</script>

<template>
  <div class="diary-empty">
    <EmptyState :icon="BookOpen" text="这一天还没有日记" />
  </div>
</template>

<style scoped>
.diary-empty {
  padding: 2rem 1rem;
}
</style>