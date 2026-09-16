<script setup>
import { ref, computed, watch } from 'vue'
import { Eye, Plus } from '@lucide/vue'
import { Button } from 'neobrutalism-vue'
import { Input } from 'neobrutalism-vue'
import PageHeader from '../common/PageHeader.vue'
import ObservationCard from './ObservationCard.vue'
import ObservationDetailPage from './ObservationDetailPage.vue'
import ObservationForm from './ObservationForm.vue'
import ObservationDeleteConfirm from './ObservationDeleteConfirm.vue'
import ObservationEmptyState from './ObservationEmptyState.vue'
import { listObservations, createObservation, updateObservation, deleteObservation } from '../../api/observation.js'

const observations = ref([])
const filterType = ref('')
const searchQuery = ref('')
const view = ref('list')
const selectedId = ref(null)
const formOpen = ref(false)
const editingObservation = ref(null)
const deleteTarget = ref(null)

const TYPES = [
  { value: '', label: '全部' },
  { value: 'note', label: '笔记' },
  { value: 'dream', label: '梦境' },
  { value: 'insight', label: '洞察' },
  { value: 'misc', label: '其他' },
]

const selectedObservation = computed(
  () => observations.value.find((o) => o.id === selectedId.value) || null,
)

async function fetchList() {
  try {
    const params = {}
    if (filterType.value) params.type = filterType.value
    if (searchQuery.value) params.q = searchQuery.value
    const res = await listObservations(params)
    observations.value = res.observations || []
  } catch {
    observations.value = []
  }
}

watch([filterType, searchQuery], fetchList, { immediate: true })

function openDetail(id) {
  selectedId.value = id
  view.value = 'detail'
}

function goBack() {
  selectedId.value = null
  view.value = 'list'
}

function openNew() {
  editingObservation.value = {}
  formOpen.value = true
}

async function onSave(formData) {
  try {
    if (editingObservation.value?.id) {
      await updateObservation(editingObservation.value.id, formData)
    } else {
      await createObservation(formData)
    }
    formOpen.value = false
    editingObservation.value = null
    fetchList()
  } catch {
    // ignore
  }
}

function onDelete() {
  deleteTarget.value = selectedObservation.value
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  try {
    await deleteObservation(deleteTarget.value.id)
    deleteTarget.value = null
    if (view.value === 'detail') goBack()
    fetchList()
  } catch {
    // ignore
  }
}
</script>

<template>
  <div class="obs-list-page">
    <div v-if="view === 'list'" class="obs-list">
      <div class="obs-list-toolbar">
        <PageHeader title="观察" :icon="Eye" />
        <div class="obs-list-filters">
          <div class="obs-filter-btns">
            <Button
              v-for="t in TYPES"
              :key="t.value"
              :variant="filterType === t.value ? '' : 'neutral'"
              size="sm"
              @click="filterType = t.value"
            >
              {{ t.label }}
            </Button>
          </div>
          <Input
            v-model="searchQuery"
            placeholder="搜索..."
            class="obs-search"
          />
          <Button variant="neutral" size="sm" @click="openNew">
            <Plus :size="14" />
            新建
          </Button>
        </div>
      </div>
      <ObservationEmptyState v-if="observations.length === 0" />
      <div v-else class="obs-list-grid">
        <ObservationCard
          v-for="o in observations"
          :key="o.id"
          :observation="o"
          @click="openDetail(o.id)"
        />
      </div>
    </div>

    <ObservationDetailPage
      v-else-if="selectedObservation"
      :observation="selectedObservation"
      @back="goBack"
      @delete="onDelete"
    />

    <ObservationForm
      v-if="formOpen"
      :initial="editingObservation"
      @save="onSave"
      @cancel="formOpen = false; editingObservation = null"
    />

    <ObservationDeleteConfirm
      :open="!!deleteTarget"
      :title="deleteTarget?.title"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>

<style scoped>
.obs-list-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.obs-list {
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  gap: 1rem;
  height: 100%;
  overflow-y: auto;
}

.obs-list-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.obs-list-filters {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.obs-filter-btns {
  display: flex;
  gap: 0.25rem;
}

.obs-search {
  flex: 1;
  max-width: 200px;
}

.obs-list-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>