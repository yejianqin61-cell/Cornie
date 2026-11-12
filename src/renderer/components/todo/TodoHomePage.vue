<script setup>
import { computed, ref, watch } from 'vue'
import { ListTodo, RefreshCw, Tags } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'
import PageHeader from '../common/PageHeader.vue'
import TodoList from './TodoList.vue'
import TodoForm from './TodoForm.vue'
import TodoEmptyState from './TodoEmptyState.vue'
import CategoryManager from '../common/CategoryManager.vue'
import { planCategoryMove } from '../common/categoryOrder.js'
import {
  listTodos,
  createTodo,
  completeTodo,
  reopenTodo,
  deleteTodo,
  updateTodo,
  listTodoCategories,
  createTodoCategory,
  updateTodoCategory,
  restoreTodoCategory,
  reorderTodoCategory,
} from '../../api/todo.js'

const todos = ref([])
const loading = ref(false)
const error = ref('')
const submitting = ref(false)
const submitError = ref('')
const formResetKey = ref(0)
const actionError = ref('')
const retryAction = ref(null)
const view = ref('open')
const categories = ref([])
const categoriesOpen = ref(false)
const categoryError = ref('')
const categoryBusy = ref(false)
const activeCategories = computed(() => categories.value.filter((item) => item.isActive !== false))

async function loadCategories() {
  try {
    const res = await listTodoCategories({ includeInactive: true })
    categories.value = res.items || []
  } catch {
    categories.value = []
  }
}

loadCategories()

function openCategories() {
  categoryError.value = ''
  categoriesOpen.value = true
}

async function runCategoryAction(action) {
  categoryBusy.value = true
  categoryError.value = ''
  try {
    await action()
    await loadCategories()
  } catch (e) {
    categoryError.value = e.message || '类目操作失败'
  }
  categoryBusy.value = false
}

function createCategory({ name }) {
  return runCategoryAction(() => createTodoCategory({ name }))
}

function renameCategory({ id, name }) {
  return runCategoryAction(() => updateTodoCategory(id, { name }))
}

function deactivateCategory(id) {
  return runCategoryAction(() => updateTodoCategory(id, { isActive: false }))
}

function restoreCategory(id) {
  return runCategoryAction(() => restoreTodoCategory(id))
}

function moveCategory({ id, direction }) {
  return runCategoryAction(async () => {
    for (const change of planCategoryMove(categories.value, id, direction)) {
      await reorderTodoCategory(change.id, change.sortOrder)
    }
  })
}

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

function clearActionError() {
  actionError.value = ''
  retryAction.value = null
}

function showActionError(error, retry = null) {
  actionError.value = error.message || '操作失败'
  retryAction.value = retry
}

async function onCreate(title, category) {
  submitting.value = true
  submitError.value = ''
  try {
    await createTodo({ title, ...(category ? { categoryId: category.id, categoryName: category.name } : {}) })
    formResetKey.value++
    fetchTodos()
  } catch (e) {
    submitError.value = e.message || '创建失败'
  }
  submitting.value = false
}

async function onComplete(id) {
  clearActionError()
  try {
    await completeTodo(id)
    fetchTodos()
  } catch (e) {
    showActionError(e, () => onComplete(id))
  }
}

async function onReopen(id) {
  clearActionError()
  try {
    await reopenTodo(id)
    fetchTodos()
  } catch (e) {
    showActionError(e, () => onReopen(id))
  }
}

async function onDelete(id) {
  clearActionError()
  try {
    await deleteTodo(id)
    fetchTodos()
  } catch (e) {
    showActionError(e)
  }
}
</script>

<template>
  <div class="todo-home">
    <PageHeader title="待办" :icon="ListTodo">
      <template #actions>
        <Button variant="neutral" size="sm" @click="openCategories">
          <Tags :size="14" />
          类目
        </Button>
      </template>
    </PageHeader>
    <TodoForm :submitting="submitting" :resetKey="formResetKey" :categories="activeCategories" @create="onCreate" />
    <div v-if="submitError" class="todo-banner todo-banner--error">{{ submitError }}</div>
    <div v-if="actionError" class="todo-banner todo-banner--error">
      <span>{{ actionError }}</span>
      <Button v-if="retryAction" variant="neutral" size="sm" @click="retryAction">
        <RefreshCw :size="12" /> 重试
      </Button>
    </div>
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
      <Button variant="neutral" size="sm" @click="fetchTodos"> <RefreshCw :size="12" /> 重试 </Button>
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
    <CategoryManager
      v-if="categoriesOpen"
      :categories="categories"
      :reorderable="true"
      :error="categoryError"
      :busy="categoryBusy"
      @create="createCategory"
      @rename="renameCategory"
      @deactivate="deactivateCategory"
      @restore="restoreCategory"
      @move="moveCategory"
      @close="categoriesOpen = false"
    />
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
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}
</style>
