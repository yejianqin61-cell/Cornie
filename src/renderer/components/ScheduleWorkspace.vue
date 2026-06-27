<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  cancelSchedule,
  createSchedule,
  createScheduleCategory,
  deleteSchedule,
  listScheduleCategories,
  listSchedules,
  reorderScheduleCategory,
  restoreSchedule,
  restoreScheduleCategory,
  updateSchedule,
  updateScheduleCategory
} from '../api'

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')

const items = ref([])
const categories = ref([])
const selectedScheduleId = ref('')
const currentView = ref('upcoming')

const scheduleForm = ref(createEmptyScheduleForm())
const categoryForm = ref(createEmptyCategoryForm())

function createEmptyScheduleForm() {
  return {
    id: '',
    title: '',
    description: '',
    categoryId: '',
    categoryName: '',
    startAt: '',
    endAt: '',
    location: ''
  }
}

function createEmptyCategoryForm() {
  return {
    name: '',
    sortOrder: ''
  }
}

const selectedSchedule = computed(() => items.value.find((item) => item.id === selectedScheduleId.value) || null)

async function refreshItems() {
  const data = await listSchedules({ view: currentView.value })
  items.value = data.items || []
}

async function refreshCategories() {
  const data = await listScheduleCategories()
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

function selectSchedule(item) {
  selectedScheduleId.value = item.id
  scheduleForm.value = {
    id: item.id,
    title: item.title ?? '',
    description: item.description ?? '',
    categoryId: item.categoryId ?? '',
    categoryName: item.categoryName ?? '',
    startAt: item.startAt ? String(item.startAt).slice(0, 16) : '',
    endAt: item.endAt ? String(item.endAt).slice(0, 16) : '',
    location: item.location ?? ''
  }
}

function resetScheduleForm() {
  selectedScheduleId.value = ''
  scheduleForm.value = createEmptyScheduleForm()
}

async function saveScheduleEntry() {
  saving.value = true
  errorMsg.value = ''
  try {
    const payload = {
      title: scheduleForm.value.title,
      description: scheduleForm.value.description || undefined,
      categoryId: scheduleForm.value.categoryId || undefined,
      categoryName: scheduleForm.value.categoryName || undefined,
      startAt: scheduleForm.value.startAt ? new Date(scheduleForm.value.startAt).toISOString() : undefined,
      endAt: scheduleForm.value.endAt ? new Date(scheduleForm.value.endAt).toISOString() : undefined,
      location: scheduleForm.value.location || undefined
    }

    if (scheduleForm.value.id) {
      await updateSchedule(scheduleForm.value.id, payload)
    } else {
      await createSchedule(payload)
    }

    await refreshItems()
    resetScheduleForm()
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    saving.value = false
  }
}

async function markCancelled(item) {
  saving.value = true
  errorMsg.value = ''
  try {
    await cancelSchedule(item.id)
    await refreshItems()
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    saving.value = false
  }
}

async function markRestore(item) {
  saving.value = true
  errorMsg.value = ''
  try {
    await restoreSchedule(item.id)
    await refreshItems()
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    saving.value = false
  }
}

async function removeSchedule(item) {
  saving.value = true
  errorMsg.value = ''
  try {
    await deleteSchedule(item.id)
    await refreshItems()
    if (selectedScheduleId.value === item.id) {
      resetScheduleForm()
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
    await createScheduleCategory({
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
      await updateScheduleCategory(category.id, { isActive: false })
    } else {
      await restoreScheduleCategory(category.id)
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
    await reorderScheduleCategory(category.id, Number(category.sortOrder || 0) + delta)
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
        <div class="workspaceTitle">日程工作台</div>
        <div class="workspaceHint">如果主人愿意，铃湾也可以在这里帮你守住接下来要做的安排。</div>
      </div>
      <button :disabled="loading" @click="refreshAll">{{ loading ? '刷新中…' : '刷新' }}</button>
    </header>

    <div v-if="errorMsg" class="workspaceError">{{ errorMsg }}</div>

    <div class="workspaceGrid">
      <section class="workspaceCard">
        <div class="cardHead">
          <div class="cardTitle">日程列表</div>
          <div class="cardFilters">
            <button :class="{ activeChip: currentView === 'upcoming' }" @click="currentView = 'upcoming'; refreshItems()">未来日程</button>
            <button :class="{ activeChip: currentView === 'cancelled' }" @click="currentView = 'cancelled'; refreshItems()">已取消</button>
          </div>
        </div>

        <div class="entryList">
          <button
            v-for="item in items"
            :key="item.id"
            class="entryRow"
            :class="{ active: item.id === selectedScheduleId }"
            @click="selectSchedule(item)"
          >
            <div>
              <div class="entryMain">{{ item.title }}</div>
              <div class="entryMeta">{{ item.categoryName || '未分类' }} · {{ item.status }}</div>
            </div>
            <div class="entryAmount">{{ item.startAt ? String(item.startAt).slice(0, 16).replace('T', ' ') : '未设时间' }}</div>
          </button>
        </div>
      </section>

      <section class="workspaceCard">
        <div class="cardHead">
          <div class="cardTitle">{{ selectedSchedule ? '编辑日程' : '新增日程' }}</div>
          <button v-if="selectedSchedule" @click="resetScheduleForm">新建一条</button>
        </div>

        <div class="formGrid">
          <label class="span2">
            <span>标题</span>
            <input v-model="scheduleForm.title" placeholder="例如：周会、看医生、去取快递" />
          </label>
          <label class="span2">
            <span>说明</span>
            <textarea v-model="scheduleForm.description" rows="4" placeholder="可以写一些背景说明" />
          </label>
          <label>
            <span>类目</span>
            <select v-model="scheduleForm.categoryId">
              <option value="">暂不指定</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>
          <label>
            <span>地点</span>
            <input v-model="scheduleForm.location" placeholder="可选" />
          </label>
          <label>
            <span>开始时间</span>
            <input v-model="scheduleForm.startAt" type="datetime-local" />
          </label>
          <label>
            <span>结束时间</span>
            <input v-model="scheduleForm.endAt" type="datetime-local" />
          </label>
        </div>

        <div class="actionRow">
          <button :disabled="saving" @click="saveScheduleEntry">{{ saving ? '保存中…' : '保存日程' }}</button>
          <button v-if="selectedSchedule && selectedSchedule.status !== 'cancelled'" :disabled="saving" @click="markCancelled(selectedSchedule)">取消日程</button>
          <button v-if="selectedSchedule && selectedSchedule.status === 'cancelled'" :disabled="saving" @click="markRestore(selectedSchedule)">恢复日程</button>
          <button v-if="selectedSchedule" class="dangerGhost" :disabled="saving" @click="removeSchedule(selectedSchedule)">删除日程</button>
        </div>
      </section>

      <section class="workspaceCard span2">
        <div class="cardHead">
          <div class="cardTitle">日程类目管理</div>
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
          <div v-for="category in categories" :key="category.id" class="categoryCard">
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
.cardFilters{
  display:flex;
  gap: 8px;
  flex-wrap: wrap;
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
.entryAmount{ font-size: 12px; color: var(--muted); text-align: right; }
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
