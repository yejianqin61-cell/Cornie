<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { createExpenseEntry, createIncomeEntry, listLedgerEntries, listLedgerCategories } from '../api'
import { listenDataChanged } from '../syncSignals'

const entries = ref([])
const categories = ref([])
const loading = ref(false)
const showForm = ref(false)
const form = ref({ amount: '', type: 'expense', categoryId: '', categoryName: '', item: '', occurredAt: new Date().toISOString().slice(0, 10) })
const saving = ref(false)
const errorMsg = ref('')

const monthlyIncome = ref(0)
const monthlyExpense = ref(0)

async function refresh() {
  loading.value = true
  try {
    const [entryData, catData] = await Promise.all([
      listLedgerEntries({}),
      listLedgerCategories({})
    ])
    const entryItems = entryData?.items || []
    entries.value = entryItems.slice(0, 10)
    categories.value = catData?.items || []

    // Calc monthly
    const now = new Date()
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    let inc = 0, exp = 0
    for (const e of entryItems) {
      if (!e.occurredAt?.startsWith(monthPrefix)) continue
      if (e.type === 'income') inc += e.amount || 0
      else exp += e.amount || 0
    }
    monthlyIncome.value = inc
    monthlyExpense.value = exp
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function submitEntry() {
  saving.value = true
  errorMsg.value = ''
  try {
    if (form.value.categoryId && form.value.categoryName) {
      const cat = categories.value.find(c => c.id === form.value.categoryId)
      if (cat) form.value.categoryName = cat.name
    }
    const fn = form.value.type === 'income' ? createIncomeEntry : createExpenseEntry
    await fn({
      amount: Number(form.value.amount),
      occurredAt: form.value.occurredAt,
      categoryId: form.value.categoryId || null,
      categoryName: form.value.categoryName || null,
      item: form.value.item || null
    })
    form.value = { amount: '', type: 'expense', categoryId: '', categoryName: '', item: '', occurredAt: new Date().toISOString().slice(0, 10) }
    showForm.value = false
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '记账失败'
  } finally {
    saving.value = false
  }
}

let stopListening = () => {}

onMounted(() => {
  refresh()
  stopListening = listenDataChanged((detail) => {
    if (detail?.ledger) refresh()
  })
})

onBeforeUnmount(() => {
  stopListening()
})
</script>

<template>
  <div class="lhome">
    <!-- 本月概览 -->
    <div class="loverview card">
      <div class="lovTitle">本月概览</div>
      <div class="lovGrid">
        <div class="lovItem"><span class="lovLabel">收入</span><span class="lovVal inc">+¥{{ monthlyIncome.toFixed(2) }}</span></div>
        <div class="lovItem"><span class="lovLabel">支出</span><span class="lovVal exp">-¥{{ monthlyExpense.toFixed(2) }}</span></div>
        <div class="lovItem"><span class="lovLabel">结余</span><span class="lovVal">¥{{ (monthlyIncome - monthlyExpense).toFixed(2) }}</span></div>
      </div>
    </div>

    <!-- 快速记一笔 -->
    <div class="lquick card">
      <div class="lquickHead">
        <div class="lquickTitle">记一笔</div>
        <button class="primary" @click="showForm = !showForm">{{ showForm ? '取消' : '记一笔' }}</button>
      </div>

      <div v-if="showForm" class="lquickForm">
        <div class="lquickRow">
          <input v-model="form.amount" type="number" placeholder="金额" step="0.01" />
          <select v-model="form.type">
            <option value="expense">支出</option>
            <option value="income">收入</option>
          </select>
        </div>
        <input v-model="form.item" placeholder="事项（可选）" />
        <input v-model="form.occurredAt" type="date" />
        <select v-model="form.categoryId">
          <option value="">选择类目</option>
          <option v-for="c in categories.filter(x => x.type === form.type)" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <button class="primary" :disabled="saving || !form.amount" @click="submitEntry">
          {{ saving ? '保存中…' : '保存' }}
        </button>
        <div v-if="errorMsg" class="lquickError">{{ errorMsg }}</div>
      </div>
    </div>

    <!-- 最近记录 -->
    <div class="lrecent card">
      <div class="lrecentHead">
        <div class="lrecentTitle">最近记录</div>
        <button class="ghost" @click="$emit('go', 'detail')">查看全部</button>
      </div>
      <div v-if="entries.length === 0" class="lrecentEmpty">还没有记录</div>
      <div v-else class="lrecentList">
        <div v-for="e in entries.slice(0, 6)" :key="e.id" class="lrecentRow">
          <span class="lrecentType">{{ e.type === 'income' ? '📥' : '📤' }}</span>
          <div class="lrecentMain">
            <span class="lrecentItem">{{ e.item || e.categoryName || '未分类' }}</span>
            <span class="lrecentCat">{{ e.occurredAt }}{{ e.categoryName && e.item ? ' · ' + e.categoryName : '' }}</span>
          </div>
          <span class="lrecentAmt" :class="e.type === 'income' ? 'inc' : 'exp'">
            {{ e.type === 'income' ? '+' : '-' }}¥{{ e.amount?.toFixed(2) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 类目入口 -->
    <div class="lcat card">
      <button @click="$emit('go', 'category')">管理收支类目 →</button>
    </div>
  </div>
</template>

<style scoped>
.lhome{ height: 100%; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 4px; }
.lhome::-webkit-scrollbar{ width: 4px; }
.lhome::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.08); border-radius: 999px; }

.loverview{ background: var(--ledger-tint); padding: 16px 20px; }
.lovTitle{ font-weight: 700; font-size: 14px; color: var(--muted); margin-bottom: 8px; }
.lovGrid{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
.lovItem{
  text-align: center;
  padding: 4px 0;
  border-right: 1px solid var(--border);
}
.lovItem:last-child{ border-right: none; }
.lovLabel{ font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px; }
.lovVal{ font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.lovVal.inc{ color: #5B9A6B; }
.lovVal.exp{ color: var(--danger); }

.lquick{ padding: 14px 20px; }
.lquickHead{ display: flex; justify-content: space-between; align-items: center; }
.lquickTitle{ font-weight: 700; }
.lquickForm{ margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.lquickForm > button,
.lquickForm > .lquickRow,
.lquickForm > input:nth-child(5),
.lquickForm > .lquickError{ grid-column: 1 / -1; }
.lquickRow{ display: flex; gap: 8px; }
.lquickError{
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger);
  font-size: 12px;
}

.lrecent{ padding: 14px 20px; }
.lrecentHead{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.lrecentTitle{ font-weight: 700; }
.lrecentEmpty{ color: var(--muted); font-size: 13px; padding: 10px 0; }
.lrecentList{ display: flex; flex-direction: column; gap: 4px; }
.lrecentRow{
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  font-size: 13px;
}
.lrecentType{
  font-size: 20px;
  line-height: 1;
}
.lrecentMain{ min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.lrecentItem{ font-weight: 500; }
.lrecentCat{
  font-size: 11px;
  color: var(--muted);
}
.lrecentAmt{
  font-weight: 700;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}
.lrecentAmt.inc{ color: #5B9A6B; }
.lrecentAmt.exp{ color: var(--danger); }

.lcat{ padding: 10px 20px; text-align: center; font-size: 13px; }
</style>
