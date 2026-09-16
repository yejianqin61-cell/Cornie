<script setup>
import { Plus } from '@lucide/vue'
import { Button, Input } from 'neobrutalism-vue'
import { ref } from 'vue'

const emit = defineEmits(['create'])

const title = ref('')
const startAt = ref('')

function submit() {
  if (!title.value.trim() || !startAt.value) return
  emit('create', { title: title.value.trim(), startAt: startAt.value })
  title.value = ''
  startAt.value = ''
}
</script>

<template>
  <div class="sch-form">
    <Input v-model="title" placeholder="日程标题..." class="sch-form-input" />
    <Input v-model="startAt" type="datetime-local" class="sch-form-date" />
    <Button variant="neutral" size="sm" @click="submit">
      <Plus :size="14" />
      添加
    </Button>
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
</style>