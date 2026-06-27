<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  createExpenseCategory,
  createExpenseEntry,
  createIncomeCategory,
  createIncomeEntry,
  deleteLedgerEntry,
  listLedgerCategories,
  listLedgerEntries,
  restoreLedgerCategory,
  updateLedgerCategory,
  updateLedgerEntry
} from '../api'

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')

const entries = ref([])
const categories = ref([])
const selectedEntryId = ref('')

const filterType = ref('')
const filterCategoryId = ref('')

const entryForm = ref(createEmptyEntryForm())
const categoryForm = ref(createEmptyCategoryForm())

function createEmptyEntryForm() {
  return {
    id: '',
    type: 'expense',
    amount: '',
    categoryId: '',
    categoryName: '',
    item: '',
    merchant: '',
    occurredAt: new Date().toISOString().slice(0, 16)
  }
}

function createEmptyCategoryForm() {
  return {
    type: 'expense',
    name: '',
    sortOrder: ''
  }
}

const filteredCategories = computed(() => {
  if (!entryForm.value.type) return categories.value
  return categories.value.filter((item) => item.type === entryForm.value.type)
})

const selectedEntry = computed(() => entries.value.find((item) => item.id === selectedEntryId.value) || null)

async function refreshEntries() {
  const params = {}
  if (filterType.value) params.type = filterType.value
  if (filterCategoryId.value) params.categoryId = filterCategoryId.value
  params.recent = 30
  const data = await listLedgerEntries(params)
  entries.value = data.items || []
}

async function refreshCategories() {
  const data = await listLedgerCategories()
  categories.value = data.items || []
}

async function refreshAll() {
  loading.value = true
  errorMsg.value = ''
  try {
    await Promise.all([refreshEntries(), refreshCategories()])
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    loading.value = false
  }
}

function selectEntry(entry) {
  selectedEntryId.value = entry.id
  entryForm.value = {
    id: entry.id,
    type: entry.type,
    amount: String(entry.amount ?? ''),
    categoryId: entry.categoryId ?? '',
    categoryName: entry.categoryName ?? '',
    item: entry.item ?? '',
    merchant: entry.merchant ?? '',
    occurredAt: String(entry.occurredAt ?? '').slice(0, 16)
  }
}

function resetEntryForm() {
  selectedEntryId.value = ''
  entryForm.value = createEmptyEntryForm()
}

async function saveEntry() {
  saving.value = true
  errorMsg.value = ''

  try {
    const payload = {
      amount: Number(entryForm.value.amount),
      categoryId: entryForm.value.categoryId || undefined,
      categoryName: entryForm.value.categoryName || undefined,
      item: entryForm.value.item || undefined,
      merchant: entryForm.value.merchant || undefined,
      occurredAt: entryForm.value.occurredAt ? new Date(entryForm.value.occurredAt).toISOString() : undefined
    }

    if (entryForm.value.id) {
      await updateLedgerEntry(entryForm.value.id, payload)
    } else if (entryForm.value.type === 'income') {
      await createIncomeEntry(payload)
    } else {
      await createExpenseEntry(payload)
    }

    await refreshEntries()
    resetEntryForm()
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    saving.value = false
  }
}

async function removeEntry(entry) {
  if (!entry?.id) return
  saving.value = true
  errorMsg.value = ''
  try {
    await deleteLedgerEntry(entry.id)
    await refreshEntries()
    if (selectedEntryId.value === entry.id) {
      resetEntryForm()
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
    const payload = {
      name: categoryForm.value.name,
      sortOrder: categoryForm.value.sortOrder === '' ? 0 : Number(categoryForm.value.sortOrder)
    }

    if (categoryForm.value.type === 'income') {
      await createIncomeCategory(payload)
    } else {
      await createExpenseCategory(payload)
    }

    categoryForm.value = createEmptyCategoryForm()
    await refreshCategories()
  } catch (error) {
    errorMsg.value = error?.message || String(error)
  } finally {
    saving.value = false
  }
}

async function toggleCategory(category) {
  if (!category?.id) return
  saving.value = true
  errorMsg.value = ''
  try {
    if (category.isActive) {
      await updateLedgerCategory(category.id, { isActive: false })
    } else {
      await restoreLedgerCategory(category.id)
    }
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
        <div class="workspaceTitle">收支工作台</div>
        <div class="workspaceHint">主人可以在这里整理最近的收入、支出，还有类目本身。</div>
      </div>
      <button :disabled="loading" @click="refreshAll">{{ loading ? '刷新中…' : '刷新' }}</button>
    </header>

    <div v-if="errorMsg" class="workspaceError">{{ errorMsg }}</div>

    <div class="workspaceGrid">
      <section class="workspaceCard">
        <div class="cardHead">
          <div class="cardTitle">最近记录</div>
          <div class="cardFilters">
            <select v-model="filterType" @change="refreshEntries">
              <option value="">全部类型</option>
              <option value="expense">支出</option>
              <option value="income">收入</option>
            </select>
            <select v-model="filterCategoryId" @change="refreshEntries">
              <option value="">全部类目</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="entryList">
          <button
            v-for="entry in entries"
            :key="entry.id"
            class="entryRow"
            :class="{ active: entry.id === selectedEntryId }"
            @click="selectEntry(entry)"
          >
            <div>
              <div class="entryMain">{{ entry.item || entry.merchant || '未命名记录' }}</div>
              <div class="entryMeta">{{ entry.categoryName || '未分类' }} · {{ entry.type === 'income' ? '收入' : '支出' }}</div>
            </div>
            <div class="entryAmount">{{ entry.type === 'income' ? '+' : '-' }}{{ entry.amount }}</div>
          </button>
        </div>
      </section>

      <section class="workspaceCard">
        <div class="cardHead">
          <div class="cardTitle">{{ selectedEntry ? '编辑记录' : '新建记录' }}</div>
          <button v-if="selectedEntry" @click="resetEntryForm">新建一条</button>
        </div>

        <div class="formGrid">
          <label>
            <span>类型</span>
            <select v-model="entryForm.type">
              <option value="expense">支出</option>
              <option value="income">收入</option>
            </select>
          </label>
          <label>
            <span>金额</span>
            <input v-model="entryForm.amount" type="number" min="0" step="0.01" />
          </label>
          <label>
            <span>类目</span>
            <select v-model="entryForm.categoryId">
              <option value="">暂不指定</option>
              <option v-for="category in filteredCategories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>
          <label>
            <span>类目名兜底</span>
            <input v-model="entryForm.categoryName" placeholder="可留空，通常由类目下拉决定" />
          </label>
          <label>
            <span>项目</span>
            <input v-model="entryForm.item" placeholder="比如：午餐、奶茶、工资" />
          </label>
          <label>
            <span>商家/来源</span>
            <input v-model="entryForm.merchant" placeholder="比如：食堂、公司" />
          </label>
          <label class="span2">
            <span>时间</span>
            <input v-model="entryForm.occurredAt" type="datetime-local" />
          </label>
        </div>

        <div class="actionRow">
          <button :disabled="saving" @click="saveEntry">{{ saving ? '保存中…' : '保存记录' }}</button>
          <button v-if="selectedEntry" class="dangerGhost" :disabled="saving" @click="removeEntry(selectedEntry)">
            删除记录
          </button>
        </div>
      </section>

      <section class="workspaceCard span2">
        <div class="cardHead">
          <div class="cardTitle">类目管理</div>
          <div class="cardHint">先把主人常用的类目准备好，铃湾之后匹配也会更稳一点。</div>
        </div>

        <div class="categoryCreator">
          <label>
            <span>类型</span>
            <select v-model="categoryForm.type">
              <option value="expense">支出类目</option>
              <option value="income">收入类目</option>
            </select>
          </label>
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
              <div class="categoryMeta">{{ category.type === 'income' ? '收入' : '支出' }} · 排序 {{ category.sortOrder }}</div>
            </div>
            <button :disabled="saving" @click="toggleCategory(category)">
              {{ category.isActive ? '停用' : '恢复' }}
            </button>
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
.cardHint{ color: var(--muted); font-size: 12px; max-width: 360px; text-align: right; }
.cardFilters{
  display:flex;
  gap: 8px;
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
.entryAmount{ font-weight: 800; font-variant-numeric: tabular-nums; }
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
  grid-template-columns: 160px 1fr 140px 140px;
  gap: 12px;
  align-items:end;
}
.categoryGrid{
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
@media (max-width: 1120px){
  .workspaceGrid{
    grid-template-columns: 1fr;
  }
  .categoryCreator{
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 720px){
  .formGrid,
  .categoryCreator{
    grid-template-columns: 1fr;
  }
  .cardHead,
  .workspaceHead{
    flex-direction: column;
  }
  .cardHint{
    text-align:left;
  }
}
</style>
