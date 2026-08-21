<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { completeTodo, createTodo, listTodoCategories, listTodos, reopenTodo, deleteTodo } from '../api'
import { listenDataChanged } from '../syncSignals'

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

const tabSummary = computed(() =>
  currentTab.value === 'archived'
    ? '这里会收好已经完成的事情，想重新捡起来也很方便。'
    : '先把眼前还没做完的小事放在最前面，铃湾会陪你一件件看。'
)

async function refresh() {
  loading.value = true
  try {
    const [todoData, catData] = await Promise.all([
      listTodos({}),
      listTodoCategories()
    ])
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
      status: 'pending'
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
      <div class="tquickHint">标题先写清楚，类目不急，能顺手补就补上。</div>
      <div class="tquickRow">
        <input v-model="newTitle" placeholder="新增待办..." @keydown.enter="addTodo" />
        <select v-model="newCategoryId">
          <option value="">类目</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <button class="primary" :disabled="adding || !newTitle.trim()" @click="addTodo">
          {{ adding ? '保存中…' : '新增' }}
        </button>
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
        <button
          class="ttab"
          :class="{ active: currentTab === 'active' }"
          type="button"
          @click="currentTab = 'active'"
        >
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

      <div v-if="visibleTodos.length === 0 && !loading" class="tempty">
        <div class="temptyTitle">{{ currentTab === 'archived' ? '这里还空着' : '今天先轻松一点' }}</div>
        <div class="temptyHint">
          {{
            currentTab === 'archived'
              ? '做完的小事以后会安静地收在这里。'
              : '还没有待办要处理，想起什么再慢慢记下来。'
          }}
        </div>
      </div>

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
            <button v-if="isDone(t)" class="ghost" @click="toggleTodo(t)">恢复</button>
            <button class="ghost tdel" @click="removeTodo(t.id)">删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.thome{
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-right: 4px;
}

.thome::-webkit-scrollbar{ width: 4px; }
.thome::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.08); border-radius: 999px; }

.tsummary{
  background: var(--todo-tint);
  padding: 16px 20px;
}

.tsummaryRow{
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}

.tsummaryBlock{
  text-align: center;
}

.tsummaryLabel{
  font-size: 12px;
  color: var(--muted);
}

.tsummaryValue{
  margin-top: 4px;
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
}

.tsummaryValue.subtle{
  color: #7C6A5E;
}

.tsummaryDivider{
  width: 1px;
  height: 38px;
  background: rgba(0,0,0,.08);
}

.tquick{
  padding: 14px 20px;
}

.tquickTitle{
  font-size: 15px;
  font-weight: 700;
}

.tquickHint{
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.tquickRow{
  margin-top: 10px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.tquickRow input{ flex: 1; }
.tquickRow select{ width: 96px; }

.terr{
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(217,106,92,.20);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 12px;
}

.tlist{
  padding: 14px 20px;
}

.tlistHead{
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.tlistTitle{
  font-weight: 700;
}

.tlistHint{
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}

.ttabs{
  margin-top: 12px;
  display: inline-flex;
  gap: 8px;
  padding: 4px;
  border-radius: 999px;
  background: #F7F3EE;
}

.ttab{
  border: none;
  background: transparent;
  border-radius: 999px;
  padding: 8px 12px;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ttab.active{
  background: #FFFFFF;
  color: var(--text);
  box-shadow: 0 2px 8px rgba(0,0,0,.05);
}

.ttabCount{
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  background: rgba(0,0,0,.06);
}

.tempty{
  margin-top: 12px;
  padding: 18px 16px;
  border-radius: 16px;
  border: 1px dashed var(--border);
  background: rgba(255,255,255,.55);
}

.temptyTitle{
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.temptyHint{
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.titems{
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.titem{
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: #FFFFFF;
}

.titem.archived{
  background: #FCFAF7;
  border-color: rgba(0,0,0,.06);
}

.titemCheck{
  position: relative;
  width: 18px;
  height: 18px;
}

.titemCheck input{
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.tcheckVisual{
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,.16);
  background: #FFFFFF;
}

.titemCheck input:checked + .tcheckVisual{
  background: var(--success);
  border-color: var(--success);
  box-shadow: inset 0 0 0 4px rgba(255,255,255,.95);
}

.titemMain{
  min-width: 0;
}

.titemTitle{
  font-size: 14px;
  color: var(--text);
}

.titem.archived .titemTitle{
  color: #7C6A5E;
}

.titemMeta{
  margin-top: 4px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.titemCat{
  font-size: 11px;
  color: var(--muted);
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
}

.titemDate{
  font-size: 11px;
  color: var(--muted);
}

.titemActions{
  display: flex;
  gap: 6px;
  align-items: center;
}

.tdel{
  color: var(--danger);
}

@media (max-width: 720px){
  .tquickRow{
    flex-direction: column;
    align-items: stretch;
  }

  .tquickRow select{
    width: 100%;
  }

  .tlistHead{
    flex-direction: column;
  }

  .titem{
    grid-template-columns: auto 1fr;
  }

  .titemActions{
    grid-column: 2;
    justify-content: flex-start;
  }
}
</style>
