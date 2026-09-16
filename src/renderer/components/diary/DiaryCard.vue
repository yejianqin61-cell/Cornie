<script setup>
defineProps({
  entry: { type: Object, required: true },
  date: { type: String, required: true },
})

const emit = defineEmits(['save', 'regenerate'])

import CornieDiaryView from './CornieDiaryView.vue'
import UserDiaryEditor from './UserDiaryEditor.vue'
</script>

<template>
  <div class="diary-card">
    <div class="diary-card-columns">
      <UserDiaryEditor
        :text="entry.userText || ''"
        :date="date"
        @save="(v) => $emit('save', v)"
      />
      <CornieDiaryView
        v-if="entry.cornieText"
        :text="entry.cornieText"
      />
      <div v-else class="diary-card-no-cornie">
        Cornie 还未写日记
      </div>
    </div>
  </div>
</template>

<style scoped>
.diary-card {
  border: 2px solid var(--nb-border);
  border-radius: 0.75rem;
  padding: 1.25rem;
  background: var(--nb-background);
}

.diary-card-columns {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.diary-card-no-cornie {
  font-size: 0.85rem;
  color: var(--nb-text-secondary);
  text-align: center;
  padding: 1.5rem;
  border: 2px dashed var(--nb-border);
  border-radius: 0.5rem;
}
</style>