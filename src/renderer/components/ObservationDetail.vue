<script setup>
import { computed, onMounted, ref } from 'vue'
import { getObservation, updateObservation, deleteObservation } from '../api'

const props = defineProps({
  id: { type: String, required: true }
})

const emit = defineEmits(['back', 'deleted'])

const OBSERVATION_TYPES = {
  event: {
    label: '生活事件',
    guide: '这类观察通常是今天发生过的一件事，适合记下事情本身和当时的情景。'
  },
  fact: {
    label: '事实片段',
    guide: '这类观察更像一条客观事实，重点是把值得留下来的信息记清楚。'
  },
  emotion: {
    label: '情绪变化',
    guide: '这类观察适合记下当时的情绪起伏，以及是什么让情绪有了变化。'
  },
  preference: {
    label: '偏好线索',
    guide: '这类观察通常是在慢慢发现你喜欢什么、不喜欢什么，或怎样会更舒服。'
  },
  misc: {
    label: '小事记录',
    guide: '这类观察像一张生活便签，先把小事留下来，之后再决定它重不重要。'
  }
}

const obs = ref(null)
const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const dirty = ref(false)

const typeMeta = computed(() => OBSERVATION_TYPES[obs.value?.type] || OBSERVATION_TYPES.misc)
const contentPlaceholder = computed(() => {
  if (obs.value?.type === 'event') return '可以写这件事是什么时候发生的、当时有什么细节、为什么值得留一下。'
  if (obs.value?.type === 'fact') return '可以把这条事实写得更清楚一点，方便以后回想时不混淆。'
  if (obs.value?.type === 'emotion') return '可以写当时的感受、触发它的事，以及你自己注意到的变化。'
  if (obs.value?.type === 'preference') return '可以写你喜欢或不喜欢什么，这种偏好通常在什么情景下出现。'
  return '把这件小事补充完整一点，让以后回来看时还能想起当时的感觉。'
})

onMounted(async () => {
  loading.value = true
  try {
    const data = await getObservation(props.id)
    obs.value = data.observation
  } catch (e) {
    errorMsg.value = e?.message || '这条观察暂时没打开成功，稍后再试一次吧。'
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
    errorMsg.value = e?.message || '这次还没保存成功，不过内容还在，我们再试一次就好。'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!confirm('要把这条观察收起来吗？删掉之后，它就不会再留在今天的小事里了。')) return
  try {
    await deleteObservation(props.id)
    emit('deleted')
  } catch (e) {
    errorMsg.value = e?.message || '这条观察这次还没删掉，我们稍后再试一次吧。'
  }
}
</script>

<template>
  <div class="odetail">
    <header class="odetailHead">
      <button class="ghost" @click="$emit('back')">← 返回观察记录</button>
      <div class="odetailActions">
        <button class="danger" @click="remove">删除</button>
        <button class="primary" :disabled="saving || !dirty" @click="save">
          {{ saving ? '保存中…' : '保存修改' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="odetailLoading">加载中…</div>
    <div v-else-if="errorMsg && !obs" class="odetailError">{{ errorMsg }}</div>
    <div v-else-if="obs" class="odetailCard card">
      <div class="odetailMeta">
        <span>{{ obs.date }}</span>
        <span class="odetailType">{{ typeMeta.label }}</span>
      </div>

      <section class="odetailGuide">
        <div class="odetailGuideEyebrow">这是一条怎样的小事</div>
        <div class="odetailGuideTitle">{{ typeMeta.label }}</div>
        <div class="odetailGuideBody">{{ typeMeta.guide }}</div>
      </section>

      <label class="odetailField">
        <span>这件小事的标题</span>
        <input
          v-model="obs.title"
          class="odetailTitle"
          placeholder="先给这条观察起个容易翻回来的名字"
          @input="dirty = true"
        />
      </label>

      <label class="odetailField odetailFieldGrow">
        <span>把当时的情况写下来</span>
        <textarea
          v-model="obs.content"
          class="odetailContent"
          :placeholder="contentPlaceholder"
          @input="dirty = true"
        />
      </label>

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

.odetailActions{
  display: flex;
  gap: 8px;
}

.odetailLoading{
  text-align: center;
  color: var(--muted);
  padding: 40px;
}

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
  flex-wrap: wrap;
}

.odetailType{
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--accent-strong);
  background: rgba(232,133,106,.12);
}

.odetailGuide{
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  background: linear-gradient(180deg, rgba(255,252,249,.95), #fff);
}

.odetailGuideEyebrow{
  font-size: 11px;
  letter-spacing: .04em;
  color: var(--muted);
}

.odetailGuideTitle{
  margin-top: 4px;
  font-size: 16px;
  font-weight: 800;
}

.odetailGuideBody{
  margin-top: 6px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
}

.odetailField{
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.odetailField > span{
  font-size: 12px;
  color: var(--muted);
}

.odetailFieldGrow{
  flex: 1;
  min-height: 220px;
}

.odetailTitle,
.odetailContent{
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  color: var(--text);
  padding: 12px 14px;
}

.odetailTitle{
  font-size: 16px;
  font-weight: 600;
}

.odetailContent{
  flex: 1;
  min-height: 220px;
  resize: vertical;
  font-size: 14px;
  line-height: 1.7;
}

@media (max-width: 760px){
  .odetailHead{
    flex-direction: column;
    align-items: stretch;
  }

  .odetailActions{
    flex-direction: column;
  }
}
</style>
