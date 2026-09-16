<script setup>
import { ref } from 'vue'
import { Button } from 'neobrutalism-vue'
import { X, Loader2 } from '@lucide/vue'

const props = defineProps({
  page: { type: Object, default: () => ({}) },
  saving: { type: Boolean, default: false },
  saveError: { type: String, default: '' },
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
        <Button variant="neutral" size="icon" :disabled="saving" @click="$emit('cancel')">
          <X :size="16" />
        </Button>
      </div>
      <label class="mw-editor-field">
        <span>标题</span>
        <input v-model="form.title" type="text" class="mw-editor-input" :disabled="saving" />
      </label>
      <label class="mw-editor-field">
        <span>摘要</span>
        <textarea v-model="form.summary" class="mw-editor-input mw-editor-textarea" rows="3" :disabled="saving" />
      </label>
      <label class="mw-editor-field">
        <span>正文</span>
        <textarea v-model="form.body" class="mw-editor-input mw-editor-textarea" rows="8" :disabled="saving" />
      </label>
      <div v-if="saveError" class="mw-editor-error">{{ saveError }}</div>
      <div class="mw-editor-actions">
        <Button variant="neutral" :disabled="saving" @click="$emit('cancel')">取消</Button>
        <Button :disabled="saving" @click="submit">
          <Loader2 v-if="saving" :size="14" class="spin" />
          {{ saving ? '保存中...' : '保存' }}
        </Button>
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

.mw-editor-error {
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