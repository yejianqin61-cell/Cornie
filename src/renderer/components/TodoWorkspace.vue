<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  completeTodo,
  createTodo,
  createTodoCategory,
  deleteTodo,
  listTodoCategories,
  listTodos,
  reopenTodo,
  restoreTodoCategory,
  reorderTodoCategory,
  updateTodo,
  updateTodoCategory
} from '../api'

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')

const items = ref([])
const categories = ref([])
const selectedTodoId = ref('')
const currentView = ref('open')

const todoForm = ref(createEmptyTodoForm())
const categoryForm = ref(createEmptyCategoryForm())

function createEmptyTodoForm() {
  return {
    id: '',
    title: '',
    description: '',
    categoryId: '',
    categoryName: '',
    dueAt: ''
  }
}

function createEmptyCategoryForm() {
  return {
    name: '',
    sortOrder: ''
  }
}

const selectedTodo = computed(() => items.value.find((item) => item.id === selectedTodoId.value) || null)
const todoViewSummary = computed(() => (currentView.value === 'completed' ? '已完成事项' : '未完成事项'))

async function refreshItems() {
  const data = await listTodos({ view: currentView.value })
  items.value = data.items || []
}

async function refreshCategories() {
  const data = await listTodoCategories()
  categories.value = data.items || []
}

async function refreshAll() {
  loading.value = true
  errorMsg.value = ''
  try {
    await Promise.all([refreshItems(), refreshCategories()])
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    loading.value = false
  }
}

function selectTodo(item) {
  selectedTodoId.value = item.id
  todoForm.value = {
    id: item.id,
    title: item.title ?? '',
    description: item.description ?? '',
    categoryId: item.categoryId ?? '',
    categoryName: item.categoryName ?? '',
    dueAt: item.dueAt ? String(item.dueAt).slice(0, 16) : ''
  }
}

function resetTodoForm() {
  selectedTodoId.value = ''
  todoForm.value = createEmptyTodoForm()
}

async function saveTodo() {
  saving.value = true
  errorMsg.value = ''
  try {
    const payload = {
      title: todoForm.value.title,
      description: todoForm.value.description || undefined,
      categoryId: todoForm.value.categoryId || undefined,
      categoryName: todoForm.value.categoryName || undefined,
      dueAt: todoForm.value.dueAt ? new Date(todoForm.value.dueAt).toISOString() : undefined
    }

    if (todoForm.value.id) {
      await updateTodo(todoForm.value.id, payload)
    } else {
      await createTodo(payload)
    }

    await refreshItems()
    resetTodoForm()
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    saving.value = false
  }
}

async function markComplete(item) {
  saving.value = true
  errorMsg.value = ''
  try {
    await completeTodo(item.id)
    await refreshItems()
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    saving.value = false
  }
}

async function markReopen(item) {
  saving.value = true
  errorMsg.value = ''
  try {
    await reopenTodo(item.id)
    await refreshItems()
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    saving.value = false
  }
}

async function removeTodo(item) {
  saving.value = true
  errorMsg.value = ''
  try {
    await deleteTodo(item.id)
    await refreshItems()
    if (selectedTodoId.value === item.id) {
      resetTodoForm()
    }
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    saving.value = false
  }
}

async function saveCategory() {
  saving.value = true
  errorMsg.value = ''
  try {
    await createTodoCategory({
      name: categoryForm.value.name,
      sortOrder: categoryForm.value.sortOrder === '' ? 0 : Number(categoryForm.value.sortOrder)
    })
    categoryForm.value = createEmptyCategoryForm()
    await refreshCategories()
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    saving.value = false
  }
}

async function toggleCategory(category) {
  saving.value = true
  errorMsg.value = ''
  try {
    if (category.isActive) {
      await updateTodoCategory(category.id, { isActive: false })
    } else {
      await restoreTodoCategory(category.id)
    }
    await refreshCategories()
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    saving.value = false
  }
}

async function moveCategory(category, delta) {
  saving.value = true
  errorMsg.value = ''
  try {
    await reorderTodoCategory(category.id, Number(category.sortOrder || 0) + delta)
    await refreshCategories()
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    saving.value = false
  }
}

onMounted(refreshAll)
</script>

<template>
  <section class="workspaceShell">
    <header class="workspaceHead">
      <div>
        <div class="workspaceTitle">待办工作台</div>
        <div class="workspaceHint">铃湾会把重要的小事记下来，主人也可以在这里慢慢整理它们。</div>
      </div>
      <button :disabled="loading" @click="refreshAll">{{ loading ? '刷新中…' : '刷新' }}</button>
    </header>

    <div v-if="errorMsg" class="workspaceError">{{ errorMsg }}</div>

    <div class="workspaceGrid">
      <section class="workspaceCard">
        <div class="cardHead">
          <div>
            <div class="cardTitle">待办列表</div>
            <div class="cardSubhint">先看眼前还没做完的，再决定铃湾要先陪你处理哪一件。</div>
          </div>
          <div class="cardFilters">
            <button :class="{ activeChip: currentView === 'open' }" @click="currentView = 'open'; refreshItems()">未完成</button>
            <button :class="{ activeChip: currentView === 'completed' }" @click="currentView = 'completed'; refreshItems()">已完成</button>
          </div>
        </div>

        <div class="viewSummary">当前查看：{{ todoViewSummary }}</div>

        <div v-if="items.length === 0" class="emptyState">
          这一栏现在还是空的。等主人记下一件小事，铃湾就会帮你把它放稳。
        </div>

        <div v-else class="entryList">
          <button
            v-for="item in items"
            :key="item.id"
            class="entryRow"
            :class="{ active: item.id === selectedTodoId }"
            @click="selectTodo(item)"
          >
            <div>
              <div class="entryMain">{{ item.title }}</div>
              <div class="entryMeta">{{ item.categoryName || '未分类' }} · {{ item.status }}</div>
            </div>
            <div class="entryAmount">{{ item.dueAt ? String(item.dueAt).slice(0, 10) : '未设日期' }}</div>
          </button>
        </div>
      </section>

      <section class="workspaceCard">
        <div class="cardHead">
          <div>
            <div class="cardTitle">{{ selectedTodo ? '编辑待办' : '新增待办' }}</div>
            <div class="cardSubhint">
              {{ selectedTodo ? '当前正在整理这条待办的标题、说明和截止时间。' : '先写标题，再决定要不要补类目和截止时间。' }}
            </div>
          </div>
          <button v-if="selectedTodo" @click="resetTodoForm">新建一条</button>
        </div>

        <div class="formGrid">
          <label class="span2">
            <span>标题</span>
            <input v-model="todoForm.title" placeholder="例如：整理记账类目" />
          </label>
          <label class="span2">
            <span>说明</span>
            <textarea v-model="todoForm.description" rows="4" placeholder="写一点补充说明也可以" />
          </label>
          <label>
            <span>类目</span>
            <select v-model="todoForm.categoryId">
              <option value="">暂不指定</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>
          <label>
            <span>截止时间</span>
            <input v-model="todoForm.dueAt" type="datetime-local" />
          </label>
        </div>

        <div class="actionRow">
          <button :disabled="saving" @click="saveTodo">{{ saving ? '保存中…' : '保存待办' }}</button>
          <button v-if="selectedTodo && selectedTodo.status !== 'done'" :disabled="saving" @click="markComplete(selectedTodo)">标为完成</button>
          <button v-if="selectedTodo && selectedTodo.status === 'done'" :disabled="saving" @click="markReopen(selectedTodo)">重新打开</button>
          <button v-if="selectedTodo" class="dangerGhost" :disabled="saving" @click="removeTodo(selectedTodo)">删除待办</button>
        </div>
        <div v-if="selectedTodo" class="actionHint">
          {{ selectedTodo.status === 'done' ? '这条待办已经完成了。如果还有后续，可以重新打开继续跟进。' : '确认做完后可以直接标记完成；如果不再需要，也可以删除它。' }}
        </div>
      </section>

      <section class="workspaceCard span2">
        <div class="cardHead">
          <div>
            <div class="cardTitle">待办类目管理</div>
            <div class="cardSubhint">把常用类型提前整理好，后面无论是主人自己记，还是铃湾帮你记，都会更顺手。</div>
          </div>
        </div>

        <div class="categoryCreator">
          <label>
            <span>类目名</span>
            <input v-model="categoryForm.name" placeholder="输入新类目名" />
          </label>
          <label>
            <span>排序</span>
            <input v-model="categoryForm.sortOrder" type="number" step="1" placeholder="默认 0" />
          </label>
          <button :disabled="saving" @click="saveCategory">新增类目</button>
        </div>

        <div class="categoryGrid">
          <div v-for="category in categories" :key="category.id" class="categoryCard" :class="{ inactive: !category.isActive }">
            <div>
              <div class="categoryName">{{ category.name }}</div>
              <div class="categoryMeta">排序 {{ category.sortOrder }} · {{ category.isActive ? '启用中' : '已停用' }}</div>
            </div>
            <div class="miniActions">
              <button :disabled="saving" @click="moveCategory(category, -10)">上移</button>
              <button :disabled="saving" @click="moveCategory(category, 10)">下移</button>
              <button :disabled="saving" @click="toggleCategory(category)">{{ category.isActive ? '停用' : '恢复' }}</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.workspaceShell{
  display:flex;
  flex-direction:column;
  gap: 14px;
  min-height: 0;
}
.workspaceHead{
  display:flex;
  justify-content: space-between;
  align-items:flex-start;
  gap: 12px;
}
.workspaceTitle{ font-size: 22px; font-weight: 800; }
.workspaceHint{ margin-top: 6px; color: var(--muted); font-size: 13px; }
.workspaceError{
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(248,113,113,.35);
  background: rgba(248,113,113,.08);
  color: rgba(254,226,226,.95);
}
.workspaceGrid{
  display:grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}
.workspaceCard{
  background: rgba(255,255,255,.05);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 16px;
  display:flex;
  flex-direction:column;
  gap: 14px;
  min-height: 0;
}
.span2{ grid-column: 1 / -1; }
.cardHead{
  display:flex;
  justify-content: space-between;
  align-items:flex-start;
  gap: 12px;
}
.cardTitle{ font-weight: 800; font-size: 16px; }
.cardSubhint{ margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.5; }
.cardFilters{
  display:flex;
  gap: 8px;
  flex-wrap: wrap;
}
.viewSummary{
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px dashed rgba(255,255,255,.14);
  background: rgba(255,255,255,.03);
  color: var(--muted);
  font-size: 12px;
}
.emptyState{
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px dashed var(--border);
  background: rgba(255,255,255,.03);
  color: var(--muted);
  line-height: 1.6;
}
.activeChip{
  background: rgba(125,211,252,.12);
  border-color: rgba(125,211,252,.35);
}
.entryList{
  display:flex;
  flex-direction:column;
  gap: 8px;
  overflow:auto;
}
.entryRow{
  text-align:left;
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
}
.entryRow.active{
  background: rgba(125,211,252,.12);
  border-color: rgba(125,211,252,.35);
}
.entryMain{ font-weight: 700; }
.entryMeta{ margin-top: 4px; font-size: 12px; color: var(--muted); }
.entryAmount{ font-size: 12px; color: var(--muted); }
.formGrid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.formGrid label,
.categoryCreator label{
  display:flex;
  flex-direction:column;
  gap: 6px;
  font-size: 13px;
}
.formGrid .span2{
  grid-column: 1 / -1;
}
.actionRow{
  display:flex;
  gap: 10px;
  flex-wrap: wrap;
}
.actionHint{
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}
.dangerGhost{
  border-color: rgba(248,113,113,.35);
  background: rgba(248,113,113,.08);
}
.categoryCreator{
  display:grid;
  grid-template-columns: 1fr 160px 140px;
  gap: 12px;
  align-items:end;
}
.categoryGrid{
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
}
.categoryCard{
  display:flex;
  justify-content: space-between;
  align-items:center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: rgba(255,255,255,.03);
}
.categoryCard.inactive{
  opacity: .68;
  background: rgba(255,255,255,.02);
}
.categoryName{ font-weight: 700; }
.categoryMeta{ margin-top: 4px; font-size: 12px; color: var(--muted); }
.miniActions{
  display:flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
@media (max-width: 1120px){
  .workspaceGrid{
    grid-template-columns: 1fr;
  }
}
@media (max-width: 720px){
  .formGrid,
  .categoryCreator{
    grid-template-columns: 1fr;
  }
  .workspaceHead,
  .cardHead{
    flex-direction: column;
  }
}
</style>
