<script setup>
import { ref, watch } from 'vue'
import { Calendar } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'
import PageHeader from '../common/PageHeader.vue'
import ScheduleList from './ScheduleList.vue'
import ScheduleForm from './ScheduleForm.vue'
import ScheduleEmptyState from './ScheduleEmptyState.vue'
import { listSchedules, createSchedule, cancelSchedule, restoreSchedule, deleteSchedule } from '../../api/schedule.js'

const schedules = ref([])
const view = ref('upcoming')

const VIEWS = [
  { value: 'upcoming', label: '即将到来' },
  { value: 'today', label: '今日' },
  { value: 'cancelled', label: '已取消' },
]

async function fetchSchedules() {
  try {
    const res = await listSchedules({ view: view.value === 'cancelled' ? 'cancelled' : view.value })
    schedules.value = res.items || []
  } catch {
    schedules.value = []
  }
}

watch(view, fetchSchedules, { immediate: true })

async function onCreate({ title, startAt }) {
  try {
    await createSchedule({ title, startAt })
    fetchSchedules()
  } catch { /* ignore */ }
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
    <ScheduleForm @create="onCreate" />
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
    <ScheduleList
      v-if="schedules.length > 0"
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
</style>