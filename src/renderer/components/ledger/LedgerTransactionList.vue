<script setup>
import { Pencil, Trash2 } from '@lucide/vue'
import LedgerCategoryTag from './LedgerCategoryTag.vue'

defineProps({
  transactions: { type: Array, required: true },
  categories: { type: Array, default: () => [] },
})

defineEmits(['edit', 'delete'])

function formatDate(date) {
  return date.slice(5)
}

function findCategory(name, list) {
  return list.find(c => c.name === name) || { name, color: '#999' }
}
</script>

<template>
  <div class="tx-list">
    <div
      v-for="tx in transactions"
      :key="tx.id"
      class="tx-item"
    >
      <div class="tx-item-left">
        <LedgerCategoryTag
          :category="findCategory(tx.category, categories).name"
          :color="findCategory(tx.category, categories).color"
        />
        <div class="tx-item-info">
          <span class="tx-item-note">{{ tx.note || '无备注' }}</span>
          <span class="tx-item-date">{{ formatDate(tx.date) }}</span>
        </div>
      </div>
      <div class="tx-item-right">
        <span
          class="tx-item-amount"
          :class="tx.type === 'income' ? 'tx-item-amount--in' : 'tx-item-amount--out'"
        >
          {{ tx.type === 'income' ? '+' : '-' }}{{ tx.amount }}
        </span>
        <button class="tx-item-action" title="编辑" @click="$emit('edit', tx)">
          <Pencil :size="13" />
        </button>
        <button class="tx-item-action tx-item-action--del" title="删除" @click="$emit('delete', tx)">
          <Trash2 :size="13" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tx-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tx-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #fff;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 0 #000;
}

.tx-item:hover {
  transform: translate(1px, 1px);
  box-shadow: 3px 3px 0 0 #000;
}

.tx-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tx-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tx-item-note {
  font-size: 13px;
  font-weight: 700;
}

.tx-item-date {
  font-size: 10px;
  font-weight: 600;
  color: #999;
}

.tx-item-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tx-item-amount {
  font-size: 14px;
  font-weight: 900;
}

.tx-item-amount--out {
  color: #d44;
}

.tx-item-amount--in {
  color: #4a4;
}

.tx-item-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 2px solid #000;
  background: #fff;
  cursor: pointer;
  padding: 0;
}

.tx-item-action:hover {
  background: #f0ebe0;
}

.tx-item-action--del:hover {
  background: #fee;
  border-color: #d44;
  color: #d44;
}
</style>