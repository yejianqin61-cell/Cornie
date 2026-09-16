<script setup>
import { ref, watch } from 'vue'
import { Button } from 'neobrutalism-vue'

const props = defineProps({
  text: { type: String, default: '' },
  date: { type: String, default: '' },
})

const emit = defineEmits(['save'])

const draft = ref(props.text)
const changed = ref(false)

watch(
  () => props.text,
  (v) => {
    draft.value = v
    changed.value = false
  },
)

function onInput(e) {
  draft.value = e.target.value
  changed.value = true
}

function save() {
  emit('save', draft.value)
  changed.value = false
}
</script>

<template>
  <div class="user-diary">
    <div class="user-diary-label">你的日记</div>
    <textarea
      class="user-diary-textarea"
      :value="draft"
      placeholder="写点什么..."
      @input="onInput"
    />
    <div v-if="changed" class="user-diary-actions">
      <Button variant="neutral" size="sm" @click="save">保存</Button>
    </div>
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

.user-diary-actions {
  display: flex;
  justify-content: flex-end;
}
</style>