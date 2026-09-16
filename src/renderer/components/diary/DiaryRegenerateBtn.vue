<script setup>
import { BookOpen } from '@lucide/vue'
import EmptyState from '../common/EmptyState.vue'
import { Button } from 'neobrutalism-vue'

defineProps({
  date: { type: String, default: '' },
})
</script>

<template>
  <div class="diary-regenerate">
    <EmptyState :icon="BookOpen" text="Cornie 还未为这天写日记" />
    <div class="diary-regenerate-action">
      <Button variant="neutral" size="sm" @click="$emit('regenerate')">
        让 Cornie 写日记
      </Button>
    </div>
  </div>
</template>

<style scoped>
.diary-regenerate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 1rem;
}

.diary-regenerate-action {
  display: flex;
  gap: 0.5rem;
}
</style>