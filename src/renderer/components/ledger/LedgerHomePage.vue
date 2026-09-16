<script setup>
import { ref, computed, watch } from 'vue'
import { Receipt, Plus, RefreshCw } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'
import PageHeader from '../common/PageHeader.vue'
import EmptyState from '../common/EmptyState.vue'
import ConfirmDialog from '../common/ConfirmDialog.vue'
import LedgerTransactionList from './LedgerTransactionList.vue'
import LedgerTransactionForm from './LedgerTransactionForm.vue'
import LedgerMonthSummary from './LedgerMonthSummary.vue'
import { listEntries, addExpense, addIncome, updateEntry, deleteEntry } from '../../api/ledger.js'

const transactions = ref([])
const categories = ref([])
const loading = ref(false)
const error = ref('')
const showForm = ref(false)
const editTarget = ref(null)
const deleteTarget = ref(null)
const filterType = ref('all')
const filterMonth = ref(new Date().toISOString().slice(0, 7))
const saving = ref(false)
const saveError = ref('')

const filteredTransactions = computed(() => {
  let list = transactions.value
  if (filterMonth.value) {
    list = list.filter(t => t.date && t.date.startsWith(filterMonth.value))
  }
  if (filterType.value !== 'all') {
    list = list.filter(t => t.type === filterType.value)
  }
  return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})

const monthlyStats = computed(() => {
  const month = filterMonth.value
  const list = transactions.value.filter(t => t.date && t.date.startsWith(month))
  const income = list.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const expense = list.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0)
  return { income, expense }
})

async function fetchEntries() {
  loading.value = true
  error.value = ''
  try {
    const res = await listEntries({ month: filterMonth.value })
    transactions.value = res.entries || res.transactions || []
    categories.value = res.categories || []
  } catch (e) {
    transactions.value = []
    categories.value = []
    error.value = e.message || '加载失败'
  }
  loading.value = false
}

watch(filterMonth, fetchEntries, { immediate: true })

function openAdd() {
  editTarget.value = null
  showForm.value = true
}

function openEdit(tx) {
  editTarget.value = { ...tx }
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editTarget.value = null
  saveError.value = ''
}

async function onSave(data) {
  saving.value = true
  saveError.value = ''
  try {
    if (editTarget.value) {
      await updateEntry(editTarget.value.id, data)
    } else {
      if (data.type === 'income') {
        await addIncome(data)
      } else {
        await addExpense(data)
      }
    }
    closeForm()
    fetchEntries()
  } catch (e) {
    saveError.value = e.message || '保存失败'
  }
  saving.value = false
}

function confirmDelete(tx) {
  deleteTarget.value = tx
}

async function onDelete() {
  if (!deleteTarget.value) return
  try {
    await deleteEntry(deleteTarget.value.id)
    deleteTarget.value = null
    fetchEntries()
  } catch { /* ignore */ }
}
</script>

<template>
  <div class="ledger-home">
    <PageHeader :icon="Receipt" title="收支">
      <template #actions>
        <Button variant="primary" size="sm" @click="openAdd">
          <Plus :size="14" />
          <span>记一笔</span>
        </Button>
      </template>
    </PageHeader>

    <div class="ledger-body">
      <div class="ledger-main">
        <div class="ledger-filters">
          <div class="ledger-filter-group">
            <button
              v-for="opt in [{ k: 'all', l: '全部' }, { k: 'expense', l: '支出' }, { k: 'income', l: '收入' }]"
              :key="opt.k"
              class="ledger-filter-btn"
              :class="{ 'ledger-filter-btn--active': filterType === opt.k }"
              @click="filterType = opt.k"
            >
              {{ opt.l }}
            </button>
          </div>
          <input
            v-model="filterMonth"
            type="month"
            class="ledger-month-picker"
          />
        </div>

        <div v-if="loading" class="ledger-skeleton">
          <div class="ledger-skeleton-line" v-for="n in 5" :key="n" />
        </div>
        <div v-else-if="error" class="ledger-banner ledger-banner--error">
          <span>{{ error }}</span>
          <Button variant="neutral" size="sm" @click="fetchEntries">
            <RefreshCw :size="12" /> 重试
          </Button>
        </div>
        <div v-else-if="filteredTransactions.length === 0" class="ledger-empty-wrap">
          <EmptyState :icon="Receipt" text="暂无收支记录" />
        </div>
        <LedgerTransactionList
          v-else
          :transactions="filteredTransactions"
          :categories="categories"
          @edit="openEdit"
          @delete="confirmDelete"
        />
      </div>

      <div class="ledger-sidebar">
        <LedgerMonthSummary
          :month="filterMonth"
          :income="monthlyStats.income"
          :expense="monthlyStats.expense"
        />
      </div>
    </div>

    <LedgerTransactionForm
      v-if="showForm"
      :initialData="editTarget"
      :categories="categories"
      :saving="saving"
      :saveError="saveError"
      @save="onSave"
      @cancel="closeForm"
    />

    <ConfirmDialog
      :open="!!deleteTarget"
      title="删除记录"
      :message="deleteTarget ? '确认删除「' + (deleteTarget.note || '无备注') + '」这条收支记录吗？' : ''"
      :onConfirm="onDelete"
      :onCancel="() => deleteTarget = null"
    />
  </div>
</template>

<style scoped>
.ledger-home {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.ledger-body {
  display: flex;
  flex: 1;
  gap: 16px;
  overflow: hidden;
  padding: 1.25rem;
}

.ledger-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ledger-filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 12px;
}

.ledger-filter-group {
  display: flex;
  border: 2px solid #000;
  overflow: hidden;
}

.ledger-filter-btn {
  padding: 6px 14px;
  border: none;
  border-right: 2px solid #000;
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.ledger-filter-btn:last-child {
  border-right: none;
}

.ledger-filter-btn--active {
  background: #1a1a1a;
  color: #fff;
}

.ledger-month-picker {
  padding: 5px 10px;
  border: 3px solid #000;
  font-size: 12px;
  font-weight: 700;
  background: #fff;
  outline: none;
}

.ledger-empty-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ledger-sidebar {
  width: 220px;
  flex-shrink: 0;
}

.ledger-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border: 2px solid #000;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.ledger-banner--error {
  background: #fff0f0;
  color: var(--nb-danger, #d32f2f);
}

.ledger-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
}

.ledger-skeleton-line {
  height: 48px;
  border-radius: 0.5rem;
  background: var(--nb-border);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>