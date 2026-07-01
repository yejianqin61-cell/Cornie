<script setup>
import { computed, onMounted, ref } from 'vue'
import { archiveMemoryWikiPage, createMemoryWikiPage, getMemoryWikiPage, updateMemoryWikiPage } from '../api'

const props = defineProps({
  id: { type: String, default: '' }
})

const emit = defineEmits(['back', 'created', 'deleted'])

const PAGE_TYPES = [
  {
    value: 'identity_profile',
    label: '关于你',
    hint: '记下你的名字、身份、你和铃湾的关系，或者你最近的人生状态。'
  },
  {
    value: 'identity_person',
    label: '重要的人',
    hint: '记下你在意的人、你们的关系，还有你想保留的共同经历。'
  },
  {
    value: 'identity_preference',
    label: '你的偏好',
    hint: '记下你喜欢什么、不喜欢什么，或者你更习惯怎样被照顾。'
  },
  {
    value: 'identity_trait',
    label: '你的特征',
    hint: '记下比较稳定的性格、表达方式，或你面对压力时的样子。'
  }
]

function createEmptyPage() {
  return {
    pageType: 'identity_profile',
    title: '',
    summary: '',
    content: ''
  }
}

const page = ref(createEmptyPage())
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const errorMsg = ref('')
const dirty = ref(false)

const isCreateMode = computed(() => !props.id)
const pageTypeHint = computed(() =>
  PAGE_TYPES.find((item) => item.value === page.value.pageType)?.hint || '把这页记忆写成以后想再翻回来的样子。'
)
const submitLabel = computed(() => {
  if (saving.value) return isCreateMode.value ? '创建中…' : '保存中…'
  return isCreateMode.value ? '创建这页记忆' : '保存修改'
})

async function loadPage() {
  if (isCreateMode.value) {
    page.value = createEmptyPage()
    errorMsg.value = ''
    dirty.value = false
    return
  }

  loading.value = true
  errorMsg.value = ''
  try {
    const data = await getMemoryWikiPage(props.id)
    const loaded = data.page || data
    page.value = {
      pageType: loaded?.pageType || 'identity_profile',
      title: loaded?.title || '',
      summary: loaded?.summary || '',
      content: loaded?.content || loaded?.body || ''
    }
    dirty.value = false
  } catch (e) {
    errorMsg.value = '这页记忆暂时没打开成功，稍后再试一次吧。'
  } finally {
    loading.value = false
  }
}

function markDirty() {
  dirty.value = true
}

async function save() {
  if (!page.value.title.trim()) {
    errorMsg.value = '先给这页记忆起个名字吧。'
    return
  }

  saving.value = true
  errorMsg.value = ''
  try {
    const payload = {
      pageType: page.value.pageType,
      title: page.value.title.trim(),
      summary: page.value.summary.trim(),
      content: page.value.content.trim()
    }

    if (isCreateMode.value) {
      const result = await createMemoryWikiPage(payload)
      const created = result?.page || result
      dirty.value = false
      emit('created', created?.pageId || created?.id || '')
      return
    }

    await updateMemoryWikiPage(props.id, payload)
    dirty.value = false
  } catch (e) {
    errorMsg.value = isCreateMode.value
      ? '这页记忆还没能存好，我们换个标题或者稍后再试一次吧。'
      : '这次修改还没保存成功，不过内容还在，我们再试一次就好。'
  } finally {
    saving.value = false
  }
}

async function archivePage() {
  if (!props.id) return
  if (!confirm('要把这页记忆收起来吗？它会先从普通列表里消失。')) return

  deleting.value = true
  errorMsg.value = ''
  try {
    await archiveMemoryWikiPage(props.id)
    emit('deleted')
  } catch (e) {
    errorMsg.value = '这页记忆这次还没收起来，我们稍后再试一次吧。'
  } finally {
    deleting.value = false
  }
}

onMounted(loadPage)
</script>

<template>
  <div class="mdetail">
    <header class="mdetailHead">
      <button class="ghost" @click="$emit('back')">← 返回记忆列表</button>
      <div class="mdetailActions">
        <button v-if="!isCreateMode" class="ghost dangerGhost" :disabled="saving || deleting" @click="archivePage">
          {{ deleting ? '整理中…' : '删除这页' }}
        </button>
        <button class="primary" :disabled="saving || (!dirty && !isCreateMode)" @click="save">
          {{ submitLabel }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="mdetailLoading">加载中…</div>
    <div v-else-if="errorMsg && !page" class="mdetailError">{{ errorMsg }}</div>
    <div v-else class="mdetailCard card">
      <div class="mdetailIntro">
        <div class="mdetailMode">{{ isCreateMode ? '新建长期记忆' : '编辑长期记忆' }}</div>
        <div class="mdetailHint">{{ pageTypeHint }}</div>
      </div>

      <label class="mdetailField">
        <span>记忆类型</span>
        <select v-model="page.pageType" @change="markDirty">
          <option v-for="item in PAGE_TYPES" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>

      <label class="mdetailField">
        <span>标题</span>
        <input
          v-model="page.title"
          class="mdetailTitle"
          placeholder="比如：叶健钦、钟奕菲、我喜欢的安慰方式"
          @input="markDirty"
        />
      </label>

      <label class="mdetailField">
        <span>一句话摘要</span>
        <textarea
          v-model="page.summary"
          class="mdetailSummary"
          rows="3"
          placeholder="先用一两句话写下这页记忆最重要的意思。"
          @input="markDirty"
        />
      </label>

      <label class="mdetailField mdetailFieldGrow">
        <span>详细内容</span>
        <textarea
          v-model="page.content"
          class="mdetailContent"
          placeholder="把你想让铃湾长期记住的内容写在这里。"
          @input="markDirty"
        />
      </label>

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

.mdetailActions{
  display: flex;
  gap: 8px;
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

.mdetailIntro{
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mdetailMode{
  font-size: 18px;
  font-weight: 800;
}

.mdetailHint{
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.mdetailField{
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mdetailField > span{
  font-size: 12px;
  color: var(--muted);
}

.mdetailFieldGrow{
  flex: 1;
  min-height: 240px;
}

.mdetailTitle,
.mdetailSummary,
.mdetailContent,
.mdetailField select{
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  color: var(--text);
  padding: 12px 14px;
  font-size: 14px;
}

.mdetailTitle{
  font-size: 16px;
  font-weight: 600;
}

.mdetailSummary{
  resize: vertical;
  line-height: 1.6;
}

.mdetailContent{
  min-height: 240px;
  height: 100%;
  resize: vertical;
  line-height: 1.7;
}

.dangerGhost{
  color: var(--danger);
}

@media (max-width: 760px){
  .mdetailHead{
    flex-direction: column;
    align-items: stretch;
  }

  .mdetailActions{
    flex-direction: column;
  }
}
</style>
