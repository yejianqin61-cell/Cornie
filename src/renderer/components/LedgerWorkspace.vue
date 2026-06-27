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
const selectedCategoryId = ref('')

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
    id: '',
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
const selectedCategory = computed(() => categories.value.find((item) => item.id === selectedCategoryId.value) || null)
const expenseCategories = computed(() => categories.value.filter((item) => item.type === 'expense'))
const incomeCategories = computed(() => categories.value.filter((item) => item.type === 'income'))
const entryFilterSummary = computed(() => {
  const typeLabel = filterType.value === 'income' ? '收入' : filterType.value === 'expense' ? '支出' : '全部类型'
  const category = categories.value.find((item) => item.id === filterCategoryId.value)
  const categoryLabel = category?.name || '全部类目'
  return `${typeLabel} · ${categoryLabel}`
})

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

function selectCategory(category) {
  selectedCategoryId.value = category.id
  categoryForm.value = {
    id: category.id,
    type: category.type,
    name: category.name ?? '',
    sortOrder: category.sortOrder ?? ''
  }
}

function resetCategoryForm() {
  selectedCategoryId.value = ''
  categoryForm.value = createEmptyCategoryForm()
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

    if (categoryForm.value.id) {
      await updateLedgerCategory(categoryForm.value.id, payload)
    } else if (categoryForm.value.type === 'income') {
      await createIncomeCategory(payload)
    } else {
      await createExpenseCategory(payload)
    }

    resetCategoryForm()
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
          <div>
            <div class="cardTitle">最近记录</div>
            <div class="cardSubhint">先看最近发生了什么，再决定是补记一笔，还是顺手把旧记录改得更准确一点。</div>
          </div>
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

        <div class="filterSummary">当前筛选：{{ entryFilterSummary }}</div>

        <div v-if="entries.length === 0" class="emptyState">
          这个筛选条件下还没有记录。可以换个筛选看看，或者直接在右边补记一笔新的收支。
        </div>

        <div v-else class="entryList">
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
          <div>
            <div class="cardTitle">{{ selectedEntry ? '编辑记录' : '新建记录' }}</div>
            <div class="cardSubhint">
              {{ selectedEntry ? '正在整理这笔收支的金额、类目和说明。' : '先填金额，再决定要不要补类目、项目和来源。' }}
            </div>
          </div>
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
          <div>
            <div class="cardTitle">类目管理</div>
            <div class="cardSubhint">人类现在也能直接整理收入、支出类目，不必只靠模型代劳。</div>
          </div>
          <div class="cardHint">先把主人常用的类目准备好，铃湾之后匹配也会更稳一点。</div>
        </div>

        <div class="categoryCreator">
          <div class="categoryEditorHead">
            <div class="categoryEditorTitle">{{ selectedCategory ? '编辑类目' : '新增类目' }}</div>
            <button v-if="selectedCategory" class="ghostBtn" @click="resetCategoryForm">新增一个</button>
          </div>
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
          <button :disabled="saving" @click="saveCategory">{{ selectedCategory ? '保存类目' : '新增类目' }}</button>
        </div>

        <div class="categoryGrid">
          <section class="categoryLane">
            <div class="laneTitle">支出类目</div>
            <div class="laneHint">吃喝、交通、购物这类支出项目都在这里整理。</div>
            <div class="laneList">
              <button
                v-for="category in expenseCategories"
                :key="category.id"
                class="categoryCard"
                :class="{ active: category.id === selectedCategoryId, inactive: !category.isActive }"
                @click="selectCategory(category)"
              >
                <div>
                  <div class="categoryName">{{ category.name }}</div>
                  <div class="categoryMeta">支出 · 排序 {{ category.sortOrder }} · {{ category.isActive ? '启用中' : '已停用' }}</div>
                </div>
                <span class="categoryState">{{ category.isActive ? '可用' : '已停用' }}</span>
              </button>
            </div>
          </section>

          <section class="categoryLane">
            <div class="laneTitle">收入类目</div>
            <div class="laneHint">工资、奖金、红包之类的收入来源在这里整理。</div>
            <div class="laneList">
              <button
                v-for="category in incomeCategories"
                :key="category.id"
                class="categoryCard"
                :class="{ active: category.id === selectedCategoryId, inactive: !category.isActive }"
                @click="selectCategory(category)"
              >
                <div>
                  <div class="categoryName">{{ category.name }}</div>
                  <div class="categoryMeta">收入 · 排序 {{ category.sortOrder }} · {{ category.isActive ? '启用中' : '已停用' }}</div>
                </div>
                <span class="categoryState">{{ category.isActive ? '可用' : '已停用' }}</span>
              </button>
            </div>
          </section>
        </div>

        <div v-if="selectedCategory" class="categoryActions">
          <div class="categoryActionText">
            正在管理类目：<strong>{{ selectedCategory.name }}</strong>
          </div>
          <button :disabled="saving" @click="toggleCategory(selectedCategory)">
            {{ selectedCategory.isActive ? '停用当前类目' : '恢复当前类目' }}
          </button>
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
.cardSubhint{ margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.5; }
.cardFilters{
  display:flex;
  gap: 8px;
}
.filterSummary{
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
  grid-template-columns: 180px 1fr 140px 140px;
  gap: 12px;
  align-items:end;
}
.categoryEditorHead{
  display:flex;
  flex-direction:column;
  gap: 8px;
}
.categoryEditorTitle{
  font-weight: 700;
  font-size: 14px;
}
.ghostBtn{
  border-color: rgba(255,255,255,.16);
  background: rgba(255,255,255,.04);
}
.categoryGrid{
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}
.categoryLane{
  display:flex;
  flex-direction:column;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: rgba(255,255,255,.03);
}
.laneTitle{
  font-weight: 800;
  font-size: 14px;
}
.laneHint{
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}
.laneList{
  display:flex;
  flex-direction:column;
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
  text-align:left;
}
.categoryCard.active{
  background: rgba(125,211,252,.12);
  border-color: rgba(125,211,252,.35);
}
.categoryCard.inactive{
  opacity: .68;
  background: rgba(255,255,255,.02);
}
.categoryName{ font-weight: 700; }
.categoryMeta{ margin-top: 4px; font-size: 12px; color: var(--muted); }
.categoryState{
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}
.categoryActions{
  display:flex;
  justify-content: space-between;
  align-items:center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px dashed rgba(255,255,255,.14);
  background: rgba(255,255,255,.03);
}
.categoryActionText{
  color: var(--muted);
  font-size: 13px;
}
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
  .categoryActions{
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
