<script setup>
import { onMounted, ref } from 'vue'
import { createObservation, deleteObservation, listObservations } from '../api'

const observations = ref([])
const loading = ref(false)
const errorMsg = ref('')

const showAdd = ref(false)
const newForm = ref({ title: '', content: '' })
const adding = ref(false)

async function refresh() {
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await listObservations({ limit: 100 })
    observations.value = data?.observations || []
  } catch (e) {
    errorMsg.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function addObservation() {
  const title = newForm.value.title.trim()
  const content = newForm.value.content.trim()
  if (!title || !content) return

  adding.value = true
  try {
    await createObservation({ title, content, type: 'misc' })
    newForm.value = { title: '', content: '' }
    showAdd.value = false
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '添加失败'
  } finally {
    adding.value = false
  }
}

async function removeObservation(id) {
  if (!confirm('确定要删除这条观察记录吗？')) return
  try {
    await deleteObservation(id)
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '删除失败'
  }
}

function truncated(text, maxLen = 100) {
  if (!text) return ''
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text
}

onMounted(refresh)
</script>

<template>
  <div class="olist">
    <header class="olistHead">
      <button class="ghost" @click="$emit('back')">← 返回观察与记忆</button>
      <div>
        <div class="olistTitle">观察记录</div>
        <div class="olistHint">按天归档的事实小档案，铃湾平时主要参考今天这一页。</div>
      </div>
      <button class="primary" @click="showAdd = !showAdd">
        {{ showAdd ? '取消' : '记一件小事' }}
      </button>
    </header>

    <div class="olistPolicy card">
      <div class="olistPolicyTitle">归档说明</div>
      <div class="olistPolicyText">
        观察日志会按自然日保存，不会每天清空。聊天时默认只高频参考今天的记录，历史内容会在需要时再按主题或日期调取。
      </div>
    </div>

    <div v-if="errorMsg" class="olistError">{{ errorMsg }}</div>

    <div v-if="showAdd" class="olistAdd card">
      <input v-model="newForm.title" placeholder="一句话标题" />
      <textarea v-model="newForm.content" placeholder="详细内容（可选）" rows="3" />
      <button class="primary" :disabled="adding || !newForm.title.trim()" @click="addObservation">
        {{ adding ? '保存中…' : '保存' }}
      </button>
    </div>

    <div v-if="loading" class="olistLoading">加载中…</div>

    <div v-else-if="observations.length === 0" class="olistEmpty">
      <div class="olistEmptyIcon">📝</div>
      <div>还没有记录什么小事</div>
    </div>

    <div v-else class="olistList">
      <div
        v-for="obs in observations"
        :key="obs.id"
        class="olistCard card"
        @click="$emit('go', 'detail', obs.id)"
      >
        <div class="olistCardHead">
          <div class="olistCardTitle">{{ obs.title }}</div>
          <div class="olistCardDate">{{ obs.date }}</div>
        </div>
        <div class="olistCardContent">{{ truncated(obs.content, 120) }}</div>
        <button class="ghost olistDelBtn" @click.stop="removeObservation(obs.id)">删除</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.olist{
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}
.olistHead{
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
}
.olistTitle{ font-size: 18px; font-weight: 800; }
.olistHint{ font-size: 12px; color: var(--muted); margin-top: 2px; }

.olistPolicy{
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.olistPolicyTitle{
  font-size: 13px;
  font-weight: 700;
}
.olistPolicyText{
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.olistError{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger);
  font-size: 13px;
}

.olistAdd{
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.olistAdd textarea{ min-height: 80px; }

.olistLoading{ text-align: center; color: var(--muted); padding: 30px; }
.olistEmpty{
  text-align: center;
  color: var(--muted);
  padding: 40px;
  border: 1px dashed var(--border);
  border-radius: 14px;
}
.olistEmptyIcon{ font-size: 28px; margin-bottom: 8px; }

.olistList{
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 2px;
}
.olistList::-webkit-scrollbar{ width: 4px; }
.olistList::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.08); border-radius: 999px; }

.olistCard{
  padding: 14px 16px;
  cursor: pointer;
}
.olistCard:hover{ border-color: rgba(232,133,106,.25); }
.olistCardHead{
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 6px;
}
.olistCardTitle{ font-weight: 600; }
.olistCardDate{ font-size: 12px; color: var(--muted); white-space: nowrap; }
.olistCardContent{ font-size: 13px; color: var(--muted); line-height: 1.5; }
.olistDelBtn{ font-size: 12px; margin-top: 8px; align-self: flex-end; }
</style>
