<script setup>
import { Plus, Loader2 } from '@lucide/vue'
import { Button, Input } from 'neobrutalism-vue'
import { ref } from 'vue'

const props = defineProps({
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['create'])

const title = ref('')
const startAt = ref('')

function submit() {
  if (!title.value.trim() || !startAt.value) return
  emit('create', { title: title.value.trim(), startAt: startAt.value })
  title.value = ''
  startAt.value = ''
}
</script>

<template>
  <div class="sch-form">
    <Input v-model="title" placeholder="日程标题..." class="sch-form-input" :disabled="submitting" />
    <Input v-model="startAt" type="datetime-local" class="sch-form-date" :disabled="submitting" />
    <Button variant="neutral" size="sm" :disabled="submitting" @click="submit">
      <Loader2 v-if="submitting" :size="14" class="spin" />
      <Plus v-else :size="14" />
      {{ submitting ? '添加中...' : '添加' }}
    </Button>
  </div>
</template>

<style scoped>
.sch-form {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.sch-form-input {
  flex: 1;
  min-width: 150px;
}

.sch-form-date {
  width: 200px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>