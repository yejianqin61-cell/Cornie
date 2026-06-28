<script setup>
import { onMounted, ref } from 'vue'
import { getMemoryWikiPage, updateMemoryWikiPage } from '../api'

const props = defineProps({
  id: { type: String, required: true }
})

const emit = defineEmits(['back'])
const page = ref(null)
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const dirty = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const data = await getMemoryWikiPage(props.id)
    page.value = data.page || data
  } catch (e) {
    errorMsg.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
})

async function save() {
  if (!page.value) return
  saving.value = true
  errorMsg.value = ''
  try {
    await updateMemoryWikiPage(props.id, {
      title: page.value.title,
      content: page.value.content
    })
    dirty.value = false
  } catch (e) {
    errorMsg.value = e?.message || '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mdetail">
    <header class="mdetailHead">
      <button class="ghost" @click="$emit('back')">← 返回记忆列表</button>
      <button class="primary" :disabled="saving || !dirty" @click="save">
        {{ saving ? '保存中…' : '保存' }}
      </button>
    </header>

    <div v-if="loading" class="mdetailLoading">加载中…</div>
    <div v-else-if="errorMsg && !page" class="mdetailError">{{ errorMsg }}</div>
    <div v-else-if="page" class="mdetailCard card">
      <div class="mdetailHint">这是铃湾记住的关于你的事</div>
      <input
        v-model="page.title"
        class="mdetailTitle"
        placeholder="标题"
        @input="dirty = true"
      />
      <textarea
        v-model="page.content"
        class="mdetailContent"
        placeholder="内容"
        @input="dirty = true"
      />
      <div v-if="errorMsg" class="mdetailError">{{ errorMsg }}</div>
    </div>
  </div>
</template>

<style scoped>
.mdetail{
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}
.mdetailHead{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
}

.mdetailLoading{ text-align: center; color: var(--muted); padding: 40px; }
.mdetailError{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger);
  font-size: 13px;
}

.mdetailCard{
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.mdetailHint{
  font-size: 13px;
  color: var(--muted);
}
.mdetailTitle{
  font-size: 22px;
  font-weight: 700;
  border: none;
  background: transparent;
  padding: 0;
  color: var(--text);
}
.mdetailTitle:focus{ outline: none; }
.mdetailContent{
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
.mdetailContent:focus{ outline: none; }
</style>
