<script setup>
import { ref, computed, watch } from 'vue'
import { Eye, Plus, RefreshCw } from '@lucide/vue'
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
const loading = ref(false)
const error = ref('')
const filterType = ref('')
const searchQuery = ref('')
const view = ref('list')
const selectedId = ref(null)
const formOpen = ref(false)
const editingObservation = ref(null)
const deleteTarget = ref(null)
const saving = ref(false)
const saveError = ref('')

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
  loading.value = true
  error.value = ''
  try {
    const params = {}
    if (filterType.value) params.type = filterType.value
    if (searchQuery.value) params.q = searchQuery.value
    const res = await listObservations(params)
    observations.value = res.observations || []
  } catch (e) {
    observations.value = []
    error.value = e.message || '加载失败'
  }
  loading.value = false
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
  saveError.value = ''
  formOpen.value = true
}

async function onSave(formData) {
  saving.value = true
  saveError.value = ''
  try {
    if (editingObservation.value?.id) {
      await updateObservation(editingObservation.value.id, formData)
    } else {
      await createObservation(formData)
    }
    formOpen.value = false
    editingObservation.value = null
    fetchList()
  } catch (e) {
    saveError.value = e.message || '保存失败'
  }
  saving.value = false
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

      <div v-if="loading" class="obs-skeleton">
        <div class="obs-skeleton-card" v-for="n in 4" :key="n" />
      </div>
      <div v-else-if="error" class="obs-banner obs-banner--error">
        <span>{{ error }}</span>
        <Button variant="neutral" size="sm" @click="fetchList">
          <RefreshCw :size="12" /> 重试
        </Button>
      </div>
      <ObservationEmptyState v-else-if="observations.length === 0" />
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
      :saving="saving"
      :saveError="saveError"
      @save="onSave"
      @cancel="formOpen = false; editingObservation = null; saveError = ''"
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

.obs-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border: 2px solid #000;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.obs-banner--error {
  background: #fff0f0;
  color: var(--nb-danger, #d32f2f);
}

.obs-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.obs-skeleton-card {
  height: 64px;
  border-radius: 0.5rem;
  background: var(--nb-border);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>