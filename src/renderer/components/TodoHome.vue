<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { completeTodo, createTodo, listTodoCategories, listTodos, reopenTodo, deleteTodo } from '../api'
import { listenDataChanged } from '../syncSignals'

const todos = ref([])
const categories = ref([])
const loading = ref(false)
const newTitle = ref('')
const newCategoryId = ref('')
const adding = ref(false)
const errorMsg = ref('')

const activeCount = ref(0)
const doneCount = ref(0)

function isDone(todo) {
  return todo?.status === 'done'
}

function isVisibleTodo(todo) {
  return todo?.status !== 'cancelled'
}

async function refresh() {
  loading.value = true
  try {
    const [todoData, catData] = await Promise.all([
      listTodos({}),
      listTodoCategories()
    ])
    todos.value = (todoData?.items || []).filter(isVisibleTodo)
    categories.value = catData?.items || []
    activeCount.value = todos.value.filter(t => !isDone(t)).length
    doneCount.value = todos.value.filter(isDone).length
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function addTodo() {
  const title = newTitle.value.trim()
  if (!title) return
  adding.value = true
  errorMsg.value = ''
  try {
    const cat = categories.value.find(c => c.id === newCategoryId.value)
    await createTodo({
      title,
      categoryId: newCategoryId.value || null,
      categoryName: cat?.name || null,
      status: 'pending'
    })
    newTitle.value = ''
    newCategoryId.value = ''
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
    } else {
      await completeTodo(todo.id)
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
    <!-- 摘要 -->
    <div class="tsummary card" style="background: var(--todo-tint);">
      <div class="tsumText">还有 <strong>{{ activeCount }}</strong> 件待办，已完成 <strong>{{ doneCount }}</strong> 件</div>
    </div>

    <!-- 快速新增 -->
    <div class="tquick card">
      <div class="tquickRow">
        <input v-model="newTitle" placeholder="新增待办…" @keydown.enter="addTodo" />
        <select v-model="newCategoryId">
          <option value="">类目</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <button class="primary" :disabled="adding || !newTitle.trim()" @click="addTodo">
          {{ adding ? '…' : '新增' }}
        </button>
      </div>
      <div v-if="errorMsg" class="terr">{{ errorMsg }}</div>
    </div>

    <!-- 待办列表 -->
    <div class="tlist card">
      <div class="tlistHead">
        <div class="tlistTitle">待办列表</div>
        <button class="ghost" @click="$emit('go', 'category')">管理类目</button>
      </div>
      <div v-if="todos.length === 0 && !loading" class="tempty">还没有待办事项</div>
      <div v-else class="titems">
        <div v-for="t in todos" :key="t.id" class="titem" :class="{ done: isDone(t) }">
          <input type="checkbox" :checked="isDone(t)" @change="toggleTodo(t)" />
          <span class="titemTitle">{{ t.title }}</span>
          <span class="titemCat" v-if="t.categoryName">{{ t.categoryName }}</span>
          <button class="ghost tdel" @click="removeTodo(t.id)">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.thome{ height: 100%; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 4px; }
.thome::-webkit-scrollbar{ width: 4px; }
.thome::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.08); border-radius: 999px; }

.tsummary{ background: var(--todo-tint); padding: 12px 20px; text-align: center; }
.tsumText{ font-size: 15px; }

.tquick{ padding: 12px 20px; }
.tquickRow{ display: flex; gap: 8px; align-items: center; }
.tquickRow input{ flex: 1; }
.tquickRow select{ width: 90px; }
.terr{
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger);
  font-size: 12px;
}

.tlist{ padding: 12px 20px; }
.tlistHead{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.tlistTitle{ font-weight: 700; }
.tempty{ color: var(--muted); font-size: 13px; padding: 10px 0; }
.titems{ display: flex; flex-direction: column; gap: 4px; }
.titem{
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 10px;
  border: 1px solid var(--border);
}
.titem:hover{ background: var(--surface-2); }
.titem.done{ opacity: .45; }
.titem input[type="checkbox"]{ width: auto; cursor: pointer; }
.titemTitle{ flex: 1; font-size: 14px; }
.titemCat{ font-size: 11px; color: var(--muted); padding: 2px 8px; border: 1px solid var(--border); border-radius: 999px; }
.tdel{ font-size: 12px; opacity: .72; transition: opacity .15s; }
.titem:hover .tdel{ opacity: 1; }
</style>
