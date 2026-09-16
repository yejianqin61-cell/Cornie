<script setup>
import { Plus } from '@lucide/vue'
import { Button, Input } from 'neobrutalism-vue'
import { ref } from 'vue'

const emit = defineEmits(['create'])

const title = ref('')

function submit() {
  if (!title.value.trim()) return
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
      @keydown.enter="submit"
    />
    <Button variant="neutral" size="sm" @click="submit">
      <Plus :size="14" />
      添加
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
</style>