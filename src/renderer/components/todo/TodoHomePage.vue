<script setup>
import { ref, watch } from 'vue'
import { ListTodo, RefreshCw } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'
import PageHeader from '../common/PageHeader.vue'
import TodoList from './TodoList.vue'
import TodoForm from './TodoForm.vue'
import TodoEmptyState from './TodoEmptyState.vue'
import { listTodos, createTodo, completeTodo, reopenTodo, deleteTodo, updateTodo } from '../../api/todo.js'

const todos = ref([])
const loading = ref(false)
const error = ref('')
const submitting = ref(false)
const submitError = ref('')
const view = ref('open')

const VIEWS = [
  { value: 'open', label: '待完成' },
  { value: 'completed', label: '已完成' },
  { value: 'today', label: '今日' },
]

async function fetchTodos() {
  loading.value = true
  error.value = ''
  try {
    const res = await listTodos({ view: view.value })
    todos.value = res.items || []
  } catch (e) {
    todos.value = []
    error.value = e.message || '加载失败'
  }
  loading.value = false
}

watch(view, fetchTodos, { immediate: true })

async function onCreate(title) {
  submitting.value = true
  submitError.value = ''
  try {
    await createTodo({ title })
    fetchTodos()
  } catch (e) {
    submitError.value = e.message || '创建失败'
  }
  submitting.value = false
}

async function onComplete(id) {
  try {
    await completeTodo(id)
    fetchTodos()
  } catch { /* ignore */ }
}

async function onReopen(id) {
  try {
    await reopenTodo(id)
    fetchTodos()
  } catch { /* ignore */ }
}

async function onDelete(id) {
  try {
    await deleteTodo(id)
    fetchTodos()
  } catch { /* ignore */ }
}
</script>

<template>
  <div class="todo-home">
    <PageHeader title="待办" :icon="ListTodo" />
    <TodoForm :submitting="submitting" @create="onCreate" />
    <div v-if="submitError" class="todo-banner todo-banner--error">{{ submitError }}</div>
    <div class="todo-filters">
      <Button
        v-for="v in VIEWS"
        :key="v.value"
        :variant="view === v.value ? '' : 'neutral'"
        size="sm"
        @click="view = v.value"
      >
        {{ v.label }}
      </Button>
    </div>

    <div v-if="loading" class="todo-skeleton">
      <div class="todo-skeleton-line" v-for="n in 4" :key="n" />
    </div>
    <div v-else-if="error" class="todo-banner todo-banner--error">
      <span>{{ error }}</span>
      <Button variant="neutral" size="sm" @click="fetchTodos">
        <RefreshCw :size="12" /> 重试
      </Button>
    </div>
    <TodoList
      v-else-if="todos.length > 0"
      :items="todos"
      :view="view"
      @complete="onComplete"
      @reopen="onReopen"
      @delete="onDelete"
    />
    <TodoEmptyState v-else />
  </div>
</template>

<style scoped>
.todo-home {
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  gap: 0.75rem;
  height: 100%;
  overflow-y: auto;
}

.todo-filters {
  display: flex;
  gap: 0.25rem;
}

.todo-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border: 2px solid #000;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.todo-banner--error {
  background: #fff0f0;
  color: var(--nb-danger, #d32f2f);
}

.todo-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.todo-skeleton-line {
  height: 44px;
  border-radius: 0.5rem;
  background: var(--nb-border);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>