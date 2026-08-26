<script setup>
import { computed, onMounted, ref } from 'vue'
import { getObservation, updateObservation, deleteObservation } from '../api'
import UiButton from './ui/UiButton.vue'
import UiBadge from './ui/UiBadge.vue'
import UiCard from './ui/UiCard.vue'

const props = defineProps({
  id: { type: String, required: true },
})

const emit = defineEmits(['back', 'deleted'])

const OBSERVATION_TYPES = {
  event: {
    label: '生活事件',
  },
  fact: {
    label: '事实片段',
  },
  emotion: {
    label: '情绪变化',
  },
  preference: {
    label: '偏好线索',
  },
  misc: {
    label: '小事记录',
  },
}

const obs = ref(null)
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const dirty = ref(false)

const typeMeta = computed(() => OBSERVATION_TYPES[obs.value?.type] || OBSERVATION_TYPES.misc)
const contentPlaceholder = computed(() => {
  if (obs.value?.type === 'event') return '何时发生、有什么细节'
  if (obs.value?.type === 'fact') return '把事实写清楚'
  if (obs.value?.type === 'emotion') return '当时的感受与变化'
  if (obs.value?.type === 'preference') return '喜欢或不喜欢什么'
  return '补充细节'
})

onMounted(async () => {
  loading.value = true
  try {
    const data = await getObservation(props.id)
    obs.value = data.observation
  } catch (e) {
    errorMsg.value = e?.message || '加载失败，请稍后再试'
  } finally {
    loading.value = false
  }
})

async function save() {
  if (!obs.value) return
  saving.value = true
  errorMsg.value = ''
  try {
    const data = await updateObservation(props.id, {
      title: obs.value.title,
      content: obs.value.content,
      type: obs.value.type,
      date: obs.value.date,
    })
    obs.value = data.observation
    dirty.value = false
  } catch (e) {
    errorMsg.value = e?.message || '保存失败，请稍后再试'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!confirm('确认删除这条观察？')) return
  try {
    await deleteObservation(props.id)
    emit('deleted')
  } catch (e) {
    errorMsg.value = e?.message || '删除失败，请稍后再试'
  }
}
</script>

<template>
  <div class="odetail">
    <header class="odetailHead">
      <UiButton variant="ghost" @click="$emit('back')">← 返回</UiButton>
      <div class="odetailActions">
        <UiButton variant="dangerGhost" @click="remove">删除</UiButton>
        <UiButton variant="default" :disabled="saving || !dirty" @click="save">
          {{ saving ? '保存中…' : '保存修改' }}
        </UiButton>
      </div>
    </header>

    <div v-if="loading" class="odetailLoading">加载中…</div>
    <div v-else-if="errorMsg && !obs" class="odetailError">{{ errorMsg }}</div>
    <UiCard v-else-if="obs" class="odetailCard">
      <div class="odetailMeta">
        <span>{{ obs.date }}</span>
        <UiBadge>{{ typeMeta.label }}</UiBadge>
      </div>

      <label class="odetailField">
        <span>标题</span>
        <input v-model="obs.title" class="odetailTitle" placeholder="标题" @input="dirty = true" />
      </label>

      <label class="odetailField odetailFieldGrow">
        <span>内容</span>
        <textarea
          v-model="obs.content"
          class="odetailContent"
          :placeholder="contentPlaceholder"
          @input="dirty = true"
        />
      </label>

      <div v-if="errorMsg" class="odetailError">{{ errorMsg }}</div>
    </UiCard>
  </div>
</template>

<style scoped>
.odetail {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.odetailHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.odetailActions {
  display: flex;
  gap: 8px;
}

.odetailLoading {
  text-align: center;
  color: var(--muted);
  padding: 40px;
}

.odetailError {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-danger) 6%, transparent);
  color: var(--danger);
  font-size: var(--text-base);
}

.odetailCard {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.odetailMeta {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: var(--text-base);
  color: var(--muted);
  flex-wrap: wrap;
}

.odetailField {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.odetailField > span {
  font-size: var(--text-sm);
  color: var(--muted);
}

.odetailFieldGrow {
  flex: 1;
  min-height: 220px;
}

.odetailTitle {
  font-size: var(--text-lg);
  font-weight: 600;
}

.odetailContent {
  flex: 1;
  min-height: 220px;
  resize: vertical;
  font-size: var(--text-md);
  line-height: 1.7;
}

@media (max-width: 760px) {
  .odetailHead {
    flex-direction: column;
    align-items: stretch;
  }

  .odetailActions {
    flex-direction: column;
  }
}
</style>
