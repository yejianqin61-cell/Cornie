<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  types: { type: Array, default: () => [] },
  reorderable: { type: Boolean, default: false },
  error: { type: String, default: '' },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['create', 'rename', 'deactivate', 'restore', 'move', 'close'])

const newName = ref('')
const newType = ref(props.types[0]?.value || '')
const editingId = ref('')
const editName = ref('')

const groups = computed(() => {
  const sorted = [...props.categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  if (props.types.length === 0) return [{ key: '', label: '', items: sorted }]
  return props.types.map((type) => ({
    key: type.value,
    label: type.label,
    items: sorted.filter((item) => item.type === type.value),
  }))
})

function create() {
  const name = newName.value.trim()
  if (!name || props.busy) return
  emit('create', { name, type: props.types.length > 0 ? newType.value : '' })
  newName.value = ''
}

function startRename(category) {
  editingId.value = category.id
  editName.value = category.name
}

function saveRename() {
  const name = editName.value.trim()
  if (!name || !editingId.value) return
  emit('rename', { id: editingId.value, name })
  editingId.value = ''
  editName.value = ''
}
</script>

<template>
  <div class="cm-overlay" @click.self="emit('close')">
    <div class="cm" role="dialog" aria-label="类目管理">
      <div class="cm-header">
        <h3 class="cm-title">类目管理</h3>
        <button class="cm-btn" type="button" aria-label="关闭" @click="emit('close')">&times;</button>
      </div>

      <div class="cm-new">
        <input
          v-model="newName"
          class="cm-input"
          data-testid="category-new-name"
          placeholder="新类目名称"
          :disabled="busy"
          @keydown.enter="create"
        />
        <select v-if="types.length > 0" v-model="newType" class="cm-input cm-select" :disabled="busy">
          <option v-for="type in types" :key="type.value" :value="type.value">{{ type.label }}</option>
        </select>
        <button class="cm-btn" type="button" :disabled="busy" @click="create">新增</button>
      </div>

      <p v-if="error" class="cm-error">{{ error }}</p>

      <section v-for="group in groups" :key="group.key" class="cm-group">
        <h4 v-if="group.label" class="cm-group-title">{{ group.label }}</h4>
        <div v-if="group.items.length === 0" class="cm-empty">暂无类目</div>
        <div
          v-for="(category, index) in group.items"
          :key="category.id"
          class="cm-item"
          :class="{ 'cm-item--inactive': !category.isActive }"
        >
          <template v-if="editingId === category.id">
            <input
              v-model="editName"
              class="cm-input"
              data-testid="category-rename-input"
              @keydown.enter="saveRename"
            />
            <button class="cm-btn" type="button" @click="saveRename">保存</button>
            <button class="cm-btn" type="button" @click="editingId = ''">取消</button>
          </template>
          <template v-else>
            <span class="cm-name">{{ category.name }}</span>
            <span v-if="!category.isActive" class="cm-badge">已停用</span>
            <span class="cm-actions">
              <button class="cm-btn" type="button" :disabled="busy" @click="startRename(category)">改名</button>
              <button
                v-if="category.isActive"
                class="cm-btn"
                type="button"
                :disabled="busy"
                @click="emit('deactivate', category.id)"
              >
                停用
              </button>
              <button v-else class="cm-btn" type="button" :disabled="busy" @click="emit('restore', category.id)">
                恢复
              </button>
              <template v-if="reorderable">
                <button
                  v-if="index > 0"
                  class="cm-btn"
                  type="button"
                  :disabled="busy"
                  @click="emit('move', { id: category.id, direction: 'up' })"
                >
                  上移
                </button>
                <button
                  v-if="index < group.items.length - 1"
                  class="cm-btn"
                  type="button"
                  :disabled="busy"
                  @click="emit('move', { id: category.id, direction: 'down' })"
                >
                  下移
                </button>
              </template>
            </span>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.cm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.cm {
  background: var(--nb-background, #fff);
  border: 3px solid #000;
  border-radius: 0.75rem;
  padding: 1.25rem;
  width: 520px;
  max-width: 92vw;
  max-height: 75vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cm-title {
  font-size: 1.1rem;
  font-weight: 800;
}

.cm-new {
  display: flex;
  gap: 0.5rem;
}

.cm-input {
  flex: 1;
  border: 2px solid #000;
  border-radius: 0.5rem;
  padding: 0.35rem 0.6rem;
  font-size: 0.85rem;
  background: #fff;
}

.cm-select {
  flex: 0 0 auto;
}

.cm-btn {
  border: 2px solid #000;
  border-radius: 0.5rem;
  background: #fff;
  padding: 0.25rem 0.6rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.cm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cm-error {
  color: var(--nb-danger, #d32f2f);
  font-size: 0.8rem;
  font-weight: 600;
}

.cm-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.cm-group-title {
  font-size: 0.85rem;
  font-weight: 700;
}

.cm-empty {
  font-size: 0.8rem;
  color: var(--nb-text-secondary);
}

.cm-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 2px solid #000;
  border-radius: 0.5rem;
  padding: 0.4rem 0.6rem;
}

.cm-item--inactive {
  opacity: 0.6;
}

.cm-name {
  flex: 1;
  font-size: 0.9rem;
}

.cm-badge {
  font-size: 0.65rem;
  padding: 1px 6px;
  border: 1.5px solid #000;
  border-radius: 99px;
}

.cm-actions {
  display: flex;
  gap: 0.35rem;
}
</style>
