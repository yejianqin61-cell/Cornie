<script setup>
import { ref, watch } from 'vue'
import { Calendar, RefreshCw } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'
import PageHeader from '../common/PageHeader.vue'
import ScheduleList from './ScheduleList.vue'
import ScheduleForm from './ScheduleForm.vue'
import ScheduleEmptyState from './ScheduleEmptyState.vue'
import { listSchedules, createSchedule, cancelSchedule, restoreSchedule, deleteSchedule } from '../../api/schedule.js'

const schedules = ref([])
const loading = ref(false)
const error = ref('')
const submitting = ref(false)
const submitError = ref('')
const view = ref('upcoming')

const VIEWS = [
  { value: 'upcoming', label: '即将到来' },
  { value: 'today', label: '今日' },
  { value: 'cancelled', label: '已取消' },
]

async function fetchSchedules() {
  loading.value = true
  error.value = ''
  try {
    const res = await listSchedules({ view: view.value === 'cancelled' ? 'cancelled' : view.value })
    schedules.value = res.items || []
  } catch (e) {
    schedules.value = []
    error.value = e.message || '加载失败'
  }
  loading.value = false
}

watch(view, fetchSchedules, { immediate: true })

async function onCreate({ title, startAt }) {
  submitting.value = true
  submitError.value = ''
  try {
    await createSchedule({ title, startAt })
    fetchSchedules()
  } catch (e) {
    submitError.value = e.message || '创建失败'
  }
  submitting.value = false
}

async function onCancel(id) {
  try {
    await cancelSchedule(id)
    fetchSchedules()
  } catch { /* ignore */ }
}

async function onRestore(id) {
  try {
    await restoreSchedule(id)
    fetchSchedules()
  } catch { /* ignore */ }
}

async function onDelete(id) {
  try {
    await deleteSchedule(id)
    fetchSchedules()
  } catch { /* ignore */ }
}
</script>

<template>
  <div class="sch-home">
    <PageHeader title="日程" :icon="Calendar" />
    <ScheduleForm :submitting="submitting" @create="onCreate" />
    <div v-if="submitError" class="sch-banner sch-banner--error">{{ submitError }}</div>
    <div class="sch-filters">
      <Button
        v-for="v in VIEWS"
        :key="v.value"
        :variant="view === v.value ? '' : 'neutral'"
        size="sm"
        @click="view = v.value"
      >
        {{ v.label }}
      </Button>
    </div>

    <div v-if="loading" class="sch-skeleton">
      <div class="sch-skeleton-line" v-for="n in 4" :key="n" />
    </div>
    <div v-else-if="error" class="sch-banner sch-banner--error">
      <span>{{ error }}</span>
      <Button variant="neutral" size="sm" @click="fetchSchedules">
        <RefreshCw :size="12" /> 重试
      </Button>
    </div>
    <ScheduleList
      v-else-if="schedules.length > 0"
      :items="schedules"
      @cancel="onCancel"
      @restore="onRestore"
      @delete="onDelete"
    />
    <ScheduleEmptyState v-else />
  </div>
</template>

<style scoped>
.sch-home {
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  gap: 0.75rem;
  height: 100%;
  overflow-y: auto;
}

.sch-filters {
  display: flex;
  gap: 0.25rem;
}

.sch-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border: 2px solid #000;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.sch-banner--error {
  background: #fff0f0;
  color: var(--nb-danger, #d32f2f);
}

.sch-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sch-skeleton-line {
  height: 44px;
  border-radius: 0.5rem;
  background: var(--nb-border);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>