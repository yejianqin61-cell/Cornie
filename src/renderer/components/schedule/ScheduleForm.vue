<script setup>
import { Plus, Loader2 } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'
import AppInput from '../common/AppInput.vue'
import { computed, ref, watch } from 'vue'

const props = defineProps({
  submitting: { type: Boolean, default: false },
  resetKey: { type: Number, default: 0 },
  categories: { type: Array, default: () => [] },
  initial: { type: Object, default: null },
})

const emit = defineEmits(['create', 'update', 'cancel'])

const isEdit = computed(() => Boolean(props.initial))
const title = ref(props.initial?.title || '')
const startAt = ref(String(props.initial?.startAt || '').slice(0, 16))
const location = ref(props.initial?.location || '')
const categoryId = ref('')

watch(
  () => props.resetKey,
  () => {
    title.value = ''
    startAt.value = ''
    categoryId.value = ''
  }
)

function submit() {
  if (!title.value.trim() || !startAt.value) return
  if (isEdit.value) {
    emit('update', { title: title.value.trim(), startAt: startAt.value, location: location.value.trim() })
    return
  }
  const category = props.categories.find((item) => item.id === categoryId.value)
  emit('create', {
    title: title.value.trim(),
    startAt: startAt.value,
    ...(category ? { categoryId: category.id, categoryName: category.name } : {}),
  })
}
</script>

<template>
  <div class="sch-form">
    <AppInput v-model="title" placeholder="日程标题..." class="sch-form-input" :disabled="submitting" />
    <AppInput v-model="startAt" type="datetime-local" class="sch-form-date" :disabled="submitting" />
    <AppInput v-if="isEdit" v-model="location" placeholder="地点..." class="sch-form-input" :disabled="submitting" />
    <select
      v-if="!isEdit && categories.length > 0"
      v-model="categoryId"
      class="sch-form-category"
      data-testid="schedule-category-select"
    >
      <option value="">无类目</option>
      <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
    </select>
    <Button variant="neutral" size="sm" :disabled="submitting" @click="submit">
      <Loader2 v-if="submitting" :size="14" class="spin" />
      <Plus v-else :size="14" />
      {{ submitting ? (isEdit ? '保存中...' : '添加中...') : isEdit ? '保存' : '添加' }}
    </Button>
    <Button v-if="isEdit" variant="neutral" size="sm" :disabled="submitting" @click="emit('cancel')">取消</Button>
  </div>
</template>

<style scoped>
.sch-form {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.sch-form-input {
  flex: 1;
  min-width: 150px;
}

.sch-form-date {
  width: 200px;
}

.sch-form-category {
  border: 2px solid #000;
  border-radius: 0.5rem;
  padding: 0.3rem 0.5rem;
  background: #fff;
  font-size: 0.85rem;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
