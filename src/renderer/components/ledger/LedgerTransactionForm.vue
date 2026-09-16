<script setup>
import { ref, computed } from 'vue'
import { X, Loader2 } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'

const props = defineProps({
  initialData: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
  saveError: { type: String, default: '' },
})

const emit = defineEmits(['save', 'cancel'])

const type = ref(props.initialData?.type || 'expense')
const category = ref(props.initialData?.category || '')
const amount = ref(props.initialData?.amount || '')
const date = ref(props.initialData?.date || new Date().toISOString().slice(0, 10))
const note = ref(props.initialData?.note || '')

const filteredCategories = computed(() =>
  props.categories.filter(c => c.type === type.value)
)

function submit() {
  if (!amount.value || !category.value) return
  emit('save', {
    type: type.value,
    category: category.value,
    amount: Number(amount.value),
    date: date.value,
    note: note.value,
  })
}
</script>

<template>
  <div class="tx-form-overlay" @click.self="$emit('cancel')">
    <div class="tx-form">
      <div class="tx-form-head">
        <h3 class="tx-form-title">{{ initialData ? '编辑' : '记一笔' }}</h3>
        <button class="tx-form-close" @click="$emit('cancel')">
          <X :size="16" />
        </button>
      </div>

      <div class="tx-form-type">
        <button
          class="tx-form-type-btn"
          :class="{ 'tx-form-type-btn--active': type === 'expense' }"
          @click="type = 'expense'"
        >
          支出
        </button>
        <button
          class="tx-form-type-btn"
          :class="{ 'tx-form-type-btn--active': type === 'income' }"
          @click="type = 'income'"
        >
          收入
        </button>
      </div>

      <div class="tx-form-field">
        <label class="tx-form-label">金额</label>
        <input
          v-model="amount"
          type="number"
          class="tx-form-input"
          placeholder="0.00"
          min="0"
          step="0.01"
        />
      </div>

      <div class="tx-form-field">
        <label class="tx-form-label">分类</label>
        <div class="tx-form-categories">
          <button
            v-for="cat in filteredCategories"
            :key="cat.name"
            class="tx-form-cat-btn"
            :class="{ 'tx-form-cat-btn--active': category === cat.name }"
            :style="{ '--cat-color': cat.color }"
            @click="category = cat.name"
          >
            <span class="tx-form-cat-dot"></span>
            {{ cat.name }}
          </button>
        </div>
      </div>

      <div class="tx-form-field">
        <label class="tx-form-label">日期</label>
        <input v-model="date" type="date" class="tx-form-input" />
      </div>

      <div class="tx-form-field">
        <label class="tx-form-label">备注</label>
        <input
          v-model="note"
          type="text"
          class="tx-form-input"
          placeholder="可选备注"
        />
      </div>

      <div class="tx-form-actions">
        <Button variant="outline" size="sm" :disabled="saving" @click="$emit('cancel')">
          取消
        </Button>
        <Button variant="primary" size="sm" :disabled="saving" @click="submit">
          <Loader2 v-if="saving" :size="14" class="spin" />
          {{ saving ? '保存中...' : '保存' }}
        </Button>
      </div>
      <div v-if="saveError" class="tx-form-error">{{ saveError }}</div>
    </div>
  </div>
</template>

<style scoped>
.tx-form-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.tx-form {
  background: #fff;
  border: 3px solid #000;
  box-shadow: 6px 6px 0 0 #000;
  padding: 20px;
  width: 400px;
  max-width: 90%;
}

.tx-form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.tx-form-title {
  margin: 0;
  font-size: 16px;
  font-weight: 900;
}

.tx-form-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 2px solid #000;
  background: #fff;
  cursor: pointer;
}

.tx-form-close:hover {
  background: #f0ebe0;
}

.tx-form-type {
  display: flex;
  border: 2px solid #000;
  margin-bottom: 16px;
  overflow: hidden;
}

.tx-form-type-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-right: 2px solid #000;
  background: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.tx-form-type-btn:last-child {
  border-right: none;
}

.tx-form-type-btn--active {
  background: #1a1a1a;
  color: #fff;
}

.tx-form-field {
  margin-bottom: 14px;
}

.tx-form-label {
  display: block;
  font-size: 12px;
  font-weight: 900;
  margin-bottom: 6px;
}

.tx-form-input {
  width: 100%;
  padding: 8px 12px;
  border: 3px solid #000;
  font-size: 13px;
  font-weight: 600;
  outline: none;
  background: #fff;
  box-sizing: border-box;
}

.tx-form-input:focus {
  box-shadow: 0 0 0 2px #000;
}

.tx-form-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tx-form-cat-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 2px solid #000;
  background: #fff;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.tx-form-cat-btn--active {
  background: var(--cat-color);
}

.tx-form-cat-dot {
  width: 8px;
  height: 8px;
  background: var(--cat-color);
  border: 1px solid #000;
  flex-shrink: 0;
}

.tx-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.tx-form-error {
  margin-top: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--nb-danger, #d32f2f);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>