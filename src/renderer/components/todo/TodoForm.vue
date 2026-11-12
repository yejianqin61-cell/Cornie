<script setup>
import { Plus, Loader2 } from '@lucide/vue'
import { Button, Input } from 'neobrutalism-vue'
import { ref, watch } from 'vue'

const props = defineProps({
  submitting: { type: Boolean, default: false },
  resetKey: { type: Number, default: 0 },
  categories: { type: Array, default: () => [] },
})

const emit = defineEmits(['create'])

const title = ref('')
const categoryId = ref('')

watch(
  () => props.resetKey,
  () => {
    title.value = ''
    categoryId.value = ''
  }
)

function submit() {
  if (!title.value.trim() || props.submitting) return
  const category = props.categories.find((item) => item.id === categoryId.value)
  if (category) emit('create', title.value.trim(), { id: category.id, name: category.name })
  else emit('create', title.value.trim())
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
    <select
      v-if="categories.length > 0"
      v-model="categoryId"
      class="todo-form-category"
      data-testid="todo-category-select"
    >
      <option value="">无类目</option>
      <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
    </select>
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

.todo-form-category {
  border: 2px solid #000;
  border-radius: 0.5rem;
  padding: 0.3rem 0.5rem;
  background: #fff;
  font-size: 0.85rem;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
