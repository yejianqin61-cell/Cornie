<script setup>
import { onMounted, ref } from 'vue'
import { getObservation, updateObservation, deleteObservation } from '../api'

const props = defineProps({
  id: { type: String, required: true }
})

const emit = defineEmits(['back', 'deleted'])
const obs = ref(null)
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const dirty = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const data = await getObservation(props.id)
    obs.value = data.observation
  } catch (e) {
    errorMsg.value = e?.message || '加载失败'
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
      date: obs.value.date
    })
    obs.value = data.observation
    dirty.value = false
  } catch (e) {
    errorMsg.value = e?.message || '保存失败'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!confirm('确定要删除这条观察记录吗？')) return
  try {
    await deleteObservation(props.id)
    emit('deleted')
  } catch (e) {
    errorMsg.value = e?.message || '删除失败'
  }
}
</script>

<template>
  <div class="odetail">
    <header class="odetailHead">
      <button class="ghost" @click="$emit('back')">← 返回列表</button>
      <div class="odetailActions">
        <button class="danger" @click="remove">删除</button>
        <button class="primary" :disabled="saving || !dirty" @click="save">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="odetailLoading">加载中…</div>
    <div v-else-if="errorMsg && !obs" class="odetailError">{{ errorMsg }}</div>
    <div v-else-if="obs" class="odetailCard card">
      <div class="odetailMeta">
        <span>{{ obs.date }}</span>
        <span class="odetailType">{{ obs.type || '其他' }}</span>
      </div>
      <input
        v-model="obs.title"
        class="odetailTitle"
        placeholder="标题"
        @input="dirty = true"
      />
      <textarea
        v-model="obs.content"
        class="odetailContent"
        placeholder="内容"
        @input="dirty = true"
      />
      <div v-if="errorMsg" class="odetailError">{{ errorMsg }}</div>
    </div>
  </div>
</template>

<style scoped>
.odetail{
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}
.odetailHead{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
}
.odetailActions{ display: flex; gap: 8px; }

.odetailLoading{ text-align: center; color: var(--muted); padding: 40px; }
.odetailError{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger);
  font-size: 13px;
}

.odetailCard{
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.odetailMeta{
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: var(--muted);
}
.odetailType{
  padding: 2px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 12px;
}
.odetailTitle{
  font-size: 22px;
  font-weight: 700;
  border: none;
  background: transparent;
  padding: 0;
  color: var(--text);
}
.odetailTitle:focus{ outline: none; }
.odetailContent{
  flex: 1;
  min-height: 200px;
  font-size: 15px;
  line-height: 1.7;
  border: none;
  background: transparent;
  padding: 0;
  resize: none;
  color: var(--text);
}
.odetailContent:focus{ outline: none; }
</style>
