<script setup>
import { ref } from 'vue'
import { Button } from 'neobrutalism-vue'
import { X } from '@lucide/vue'

const props = defineProps({
  initial: { type: Object, default: () => ({}) },
  onSave: { type: Function, default: null },
  onCancel: { type: Function, default: null },
})

const emit = defineEmits(['save', 'cancel'])

const form = ref({
  date: props.initial.date || new Date().toISOString().slice(0, 10),
  type: props.initial.type || 'note',
  title: props.initial.title || '',
  content: props.initial.content || '',
})

const TYPES = [
  { value: 'note', label: '笔记' },
  { value: 'dream', label: '梦境' },
  { value: 'insight', label: '洞察' },
  { value: 'misc', label: '其他' },
]

function submit() {
  emit('save', { ...form.value })
}
</script>

<template>
  <div class="obs-form-overlay" @click.self="$emit('cancel')">
    <div class="obs-form">
      <div class="obs-form-header">
        <span class="obs-form-title">{{ initial.id ? '编辑' : '新建' }}观察</span>
        <Button variant="neutral" size="icon" @click="$emit('cancel')">
          <X :size="16" />
        </Button>
      </div>
      <label class="obs-form-field">
        <span>日期</span>
        <input v-model="form.date" type="date" class="obs-form-input" />
      </label>
      <label class="obs-form-field">
        <span>类型</span>
        <select v-model="form.type" class="obs-form-input">
          <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </label>
      <label class="obs-form-field">
        <span>标题</span>
        <input v-model="form.title" type="text" class="obs-form-input" />
      </label>
      <label class="obs-form-field">
        <span>内容</span>
        <textarea v-model="form.content" class="obs-form-input obs-form-textarea" rows="5" />
      </label>
      <div class="obs-form-actions">
        <Button variant="neutral" @click="$emit('cancel')">取消</Button>
        <Button @click="submit">保存</Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.obs-form-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.obs-form {
  background: var(--nb-background);
  border: 2px solid var(--nb-border);
  border-radius: 0.75rem;
  padding: 1.25rem;
  width: 480px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.obs-form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.obs-form-title {
  font-weight: 700;
  font-size: 1rem;
}

.obs-form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--nb-text-secondary);
}

.obs-form-input {
  border: 2px solid var(--nb-border);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  background: var(--nb-background);
  color: var(--nb-text);
  font-family: inherit;
  outline: none;
}

.obs-form-input:focus {
  border-color: var(--nb-accent);
}

.obs-form-textarea {
  resize: vertical;
  min-height: 100px;
}

.obs-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>