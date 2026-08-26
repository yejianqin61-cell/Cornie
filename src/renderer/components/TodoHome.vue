<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { completeTodo, createTodo, listTodoCategories, listTodos, reopenTodo, deleteTodo } from '../api'
import { listenDataChanged } from '../syncSignals'
import UiButton from './ui/UiButton.vue'
import UiEmpty from './ui/UiEmpty.vue'

const todos = ref([])
const categories = ref([])
const loading = ref(false)
const newTitle = ref('')
const newCategoryId = ref('')
const adding = ref(false)
const errorMsg = ref('')
const currentTab = ref('active')

const activeCount = ref(0)
const archivedCount = ref(0)

function isDone(todo) {
  return todo?.status === 'done'
}

function isVisibleTodo(todo) {
  return todo?.status !== 'cancelled'
}

const activeTodos = computed(() => todos.value.filter((todo) => !isDone(todo)))
const archivedTodos = computed(() => todos.value.filter(isDone))
const visibleTodos = computed(() => (currentTab.value === 'archived' ? archivedTodos.value : activeTodos.value))

const tabSummary = computed(() => (currentTab.value === 'archived' ? '已完成的待办' : '进行中的待办'))

async function refresh() {
  loading.value = true
  try {
    const [todoData, catData] = await Promise.all([listTodos({}), listTodoCategories()])
    todos.value = (todoData?.items || []).filter(isVisibleTodo)
    categories.value = catData?.items || []
    activeCount.value = todos.value.filter((todo) => !isDone(todo)).length
    archivedCount.value = todos.value.filter(isDone).length
  } catch {
    // ignore refresh failure
  } finally {
    loading.value = false
  }
}

async function addTodo() {
  const title = newTitle.value.trim()
  if (!title) return
  adding.value = true
  errorMsg.value = ''
  try {
    const cat = categories.value.find((c) => c.id === newCategoryId.value)
    await createTodo({
      title,
      categoryId: newCategoryId.value || null,
      categoryName: cat?.name || null,
      status: 'pending',
    })
    newTitle.value = ''
    newCategoryId.value = ''
    currentTab.value = 'active'
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '添加失败'
  } finally {
    adding.value = false
  }
}

async function toggleTodo(todo) {
  try {
    if (isDone(todo)) {
      await reopenTodo(todo.id)
      currentTab.value = 'active'
    } else {
      await completeTodo(todo.id)
      currentTab.value = 'active'
    }
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '操作失败'
  }
}

async function removeTodo(id) {
  if (!confirm('确定删除这条待办吗？')) return
  try {
    await deleteTodo(id)
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '删除失败'
  }
}

let stopListening = () => {}

onMounted(() => {
  refresh()
  stopListening = listenDataChanged((detail) => {
    if (detail?.todo) refresh()
  })
})

onBeforeUnmount(() => {
  stopListening()
})
</script>

<template>
  <div class="thome">
    <div class="tsummary card">
      <div class="tsummaryRow">
        <div class="tsummaryBlock">
          <div class="tsummaryLabel">当前待办</div>
          <div class="tsummaryValue">{{ activeCount }}</div>
        </div>
        <div class="tsummaryDivider"></div>
        <div class="tsummaryBlock">
          <div class="tsummaryLabel">已归档</div>
          <div class="tsummaryValue subtle">{{ archivedCount }}</div>
        </div>
      </div>
    </div>

    <div class="tquick card">
      <div class="tquickTitle">记下一件小事</div>
      <div class="tquickRow">
        <input v-model="newTitle" placeholder="新增待办..." @keydown.enter="addTodo" />
        <select v-model="newCategoryId">
          <option value="">类目</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <UiButton variant="default" :disabled="adding || !newTitle.trim()" @click="addTodo">
          {{ adding ? '保存中…' : '新增' }}
        </UiButton>
      </div>
      <div v-if="errorMsg" class="terr">{{ errorMsg }}</div>
    </div>

    <div class="tlist card">
      <div class="tlistHead">
        <div>
          <div class="tlistTitle">待办整理</div>
          <div class="tlistHint">{{ tabSummary }}</div>
        </div>
      </div>

      <div class="ttabs">
        <button class="ttab" :class="{ active: currentTab === 'active' }" type="button" @click="currentTab = 'active'">
          待办
          <span class="ttabCount">{{ activeCount }}</span>
        </button>
        <button
          class="ttab"
          :class="{ active: currentTab === 'archived' }"
          type="button"
          @click="currentTab = 'archived'"
        >
          已归档
          <span class="ttabCount">{{ archivedCount }}</span>
        </button>
      </div>

      <UiEmpty
        v-if="visibleTodos.length === 0 && !loading"
        icon="🗒️"
        :text="currentTab === 'archived' ? '暂无归档' : '暂无待办'"
      />

      <div v-else class="titems">
        <div v-for="t in visibleTodos" :key="t.id" class="titem" :class="{ archived: isDone(t) }">
          <label class="titemCheck">
            <input type="checkbox" :checked="isDone(t)" @change="toggleTodo(t)" />
            <span class="tcheckVisual"></span>
          </label>
          <div class="titemMain">
            <div class="titemTitle">{{ t.title }}</div>
            <div class="titemMeta">
              <span v-if="t.categoryName" class="titemCat">{{ t.categoryName }}</span>
              <span class="titemDate">{{ t.dueAt ? String(t.dueAt).slice(0, 10) : '还没有定日期' }}</span>
            </div>
          </div>
          <div class="titemActions">
            <UiButton v-if="isDone(t)" variant="ghost" size="sm" @click="toggleTodo(t)">恢复</UiButton>
            <UiButton variant="dangerGhost" size="sm" @click="removeTodo(t.id)">删除</UiButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.thome {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-right: 4px;
}

.thome::-webkit-scrollbar {
  width: 4px;
}
.thome::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
  border-radius: 999px;
}

.tsummary {
  background: var(--todo-tint);
  padding: 16px 20px;
}

.tsummaryRow {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}

.tsummaryBlock {
  text-align: center;
}

.tsummaryLabel {
  font-size: var(--text-sm);
  color: var(--muted);
}

.tsummaryValue {
  margin-top: 4px;
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--text);
}

.tsummaryValue.subtle {
  color: var(--muted);
}

.tsummaryDivider {
  width: 1px;
  height: 38px;
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
}

.tquick {
  padding: 14px 20px;
}

.tquickTitle {
  font-size: var(--text-md);
  font-weight: 700;
}

.tquickRow {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.tquickRow input {
  flex: 1;
}
.tquickRow select {
  width: 96px;
}

.terr {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: var(--text-sm);
}

.tlist {
  padding: 14px 20px;
}

.tlistHead {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.tlistTitle {
  font-weight: 700;
}

.tlistHint {
  margin-top: 4px;
  font-size: var(--text-sm);
  color: var(--muted);
  line-height: 1.5;
}

.ttabs {
  margin-top: 12px;
  display: inline-flex;
  gap: 8px;
  padding: 4px;
  border-radius: 999px;
  background: var(--surface-2);
}

.ttab {
  border: none;
  background: transparent;
  border-radius: 999px;
  padding: 8px 12px;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ttab.active {
  background: var(--color-surface);
  color: var(--text);
  box-shadow: var(--shadow-card);
}

.ttabCount {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  background: var(--surface-2);
}

.titems {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.titem {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.titem.archived {
  background: color-mix(in srgb, var(--color-text) 3%, var(--color-surface));
}

.titemCheck {
  position: relative;
  width: 18px;
  height: 18px;
}

.titemCheck input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.tcheckVisual {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-text) 16%, transparent);
  background: var(--color-surface);
}

.titemCheck input:checked + .tcheckVisual {
  background: var(--success);
  border-color: var(--success);
  box-shadow: inset 0 0 0 4px var(--color-surface);
}

.titemMain {
  min-width: 0;
}

.titemTitle {
  font-size: var(--text-md);
  color: var(--text);
}

.titem.archived .titemTitle {
  color: var(--muted);
}

.titemMeta {
  margin-top: 4px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.titemCat {
  font-size: var(--text-xs);
  color: var(--muted);
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-2);
}

.titemDate {
  font-size: var(--text-xs);
  color: var(--muted);
}

.titemActions {
  display: flex;
  gap: 6px;
  align-items: center;
}

@media (max-width: 720px) {
  .tquickRow {
    flex-direction: column;
    align-items: stretch;
  }

  .tquickRow select {
    width: 100%;
  }

  .tlistHead {
    flex-direction: column;
  }

  .titem {
    grid-template-columns: auto 1fr;
  }

  .titemActions {
    grid-column: 2;
    justify-content: flex-start;
  }
}
</style>
