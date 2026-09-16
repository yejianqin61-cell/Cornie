<script setup>
import { Plus, Loader2 } from '@lucide/vue'
import { Button, Input } from 'neobrutalism-vue'
import { ref } from 'vue'

const props = defineProps({
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['create'])

const title = ref('')

function submit() {
  if (!title.value.trim() || props.submitting) return
  emit('create', title.value.trim())
  title.value = ''
}
</script>

<template>
  <div class="todo-form">
    <Input
      v-model="title"
      placeholder="新增待办..."
      class="todo-form-input"
      :disabled="submitting"
      @keydown.enter="submit"
    />
    <Button variant="neutral" size="sm" :disabled="submitting" @click="submit">
      <Loader2 v-if="submitting" :size="14" class="spin" />
      <Plus v-else :size="14" />
      {{ submitting ? '添加中...' : '添加' }}
    </Button>
  </div>
</template>

<style scoped>
.todo-form {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.todo-form-input {
  flex: 1;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>