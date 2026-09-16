<script setup>
import { ref, watch } from 'vue'
import { ListTodo } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'
import PageHeader from '../common/PageHeader.vue'
import TodoList from './TodoList.vue'
import TodoForm from './TodoForm.vue'
import TodoEmptyState from './TodoEmptyState.vue'
import { listTodos, createTodo, completeTodo, reopenTodo, deleteTodo, updateTodo } from '../../api/todo.js'

const todos = ref([])
const view = ref('open')

const VIEWS = [
  { value: 'open', label: '待完成' },
  { value: 'completed', label: '已完成' },
  { value: 'today', label: '今日' },
]

async function fetchTodos() {
  try {
    const res = await listTodos({ view: view.value })
    todos.value = res.items || []
  } catch {
    todos.value = []
  }
}

watch(view, fetchTodos, { immediate: true })

async function onCreate(title) {
  try {
    await createTodo({ title })
    fetchTodos()
  } catch { /* ignore */ }
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
    <TodoForm @create="onCreate" />
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
    <TodoList
      v-if="todos.length > 0"
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
</style>