<script setup>
import { ref } from 'vue'
import { Button } from 'neobrutalism-vue'
import { X } from '@lucide/vue'

const props = defineProps({
  page: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['save', 'cancel'])

const form = ref({
  title: props.page.title || '',
  summary: props.page.summary || '',
  body: props.page.body || '',
})

function submit() {
  emit('save', { ...form.value })
}
</script>

<template>
  <div class="mw-editor-overlay" @click.self="$emit('cancel')">
    <div class="mw-editor">
      <div class="mw-editor-header">
        <span class="mw-editor-title">编辑记忆页面</span>
        <Button variant="neutral" size="icon" @click="$emit('cancel')">
          <X :size="16" />
        </Button>
      </div>
      <label class="mw-editor-field">
        <span>标题</span>
        <input v-model="form.title" type="text" class="mw-editor-input" />
      </label>
      <label class="mw-editor-field">
        <span>摘要</span>
        <textarea v-model="form.summary" class="mw-editor-input mw-editor-textarea" rows="3" />
      </label>
      <label class="mw-editor-field">
        <span>正文</span>
        <textarea v-model="form.body" class="mw-editor-input mw-editor-textarea" rows="8" />
      </label>
      <div class="mw-editor-actions">
        <Button variant="neutral" @click="$emit('cancel')">取消</Button>
        <Button @click="submit">保存</Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mw-editor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.mw-editor {
  background: var(--nb-background);
  border: 2px solid var(--nb-border);
  border-radius: 0.75rem;
  padding: 1.25rem;
  width: 560px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mw-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mw-editor-title {
  font-weight: 700;
  font-size: 1rem;
}

.mw-editor-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--nb-text-secondary);
}

.mw-editor-input {
  border: 2px solid var(--nb-border);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  background: var(--nb-background);
  color: var(--nb-text);
  font-family: inherit;
  outline: none;
}

.mw-editor-input:focus {
  border-color: var(--nb-accent);
}

.mw-editor-textarea {
  resize: vertical;
}

.mw-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>