<script setup>
import { ref, watch } from 'vue'
import { Button } from 'neobrutalism-vue'
import { Loader2 } from '@lucide/vue'

const props = defineProps({
  text: { type: String, default: '' },
  date: { type: String, default: '' },
})

const emit = defineEmits(['save'])

const draft = ref(props.text)
const changed = ref(false)
const saving = ref(false)
const saveError = ref('')

watch(() => props.text, (v) => {
  draft.value = v
  changed.value = false
})

function onInput(e) {
  draft.value = e.target.value
  changed.value = true
}

async function save() {
  if (saving.value) return
  saving.value = true
  saveError.value = ''
  try {
    emit('save', draft.value)
    changed.value = false
  } catch (e) {
    saveError.value = e.message || '保存失败'
  }
  saving.value = false
}
</script>

<template>
  <div class="user-diary">
    <div class="user-diary-label">你的日记</div>
    <textarea
      class="user-diary-textarea"
      :value="draft"
      placeholder="写点什么..."
      :disabled="saving"
      @input="onInput"
    />
    <div v-if="changed || saving" class="user-diary-actions">
      <Button variant="neutral" size="sm" :disabled="saving" @click="save">
        <Loader2 v-if="saving" :size="12" class="spin" />
        {{ saving ? '保存中...' : '保存' }}
      </Button>
    </div>
    <div v-if="saveError" class="user-diary-error">{{ saveError }}</div>
  </div>
</template>

<style scoped>
.user-diary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-diary-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--nb-text-secondary);
}

.user-diary-textarea {
  width: 100%;
  min-height: 120px;
  resize: vertical;
  border: 2px solid var(--nb-border);
  border-radius: 0.5rem;
  padding: 0.75rem;
  font-size: 0.9rem;
  line-height: 1.7;
  background: var(--nb-background);
  color: var(--nb-text);
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.user-diary-textarea:focus {
  border-color: var(--nb-accent);
}

.user-diary-textarea:disabled {
  opacity: 0.6;
}

.user-diary-actions {
  display: flex;
  gap: 0.5rem;
}

.user-diary-error {
  font-size: 0.7rem;
  color: var(--nb-danger, #d32f2f);
  font-weight: 600;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>