<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { cancelSchedule, createSchedule, deleteSchedule, listScheduleCategories, listSchedules, restoreSchedule } from '../api'
import { listenDataChanged } from '../syncSignals'

const schedules = ref([])
const categories = ref([])
const loading = ref(false)
const newForm = ref({ title: '', startAt: '', endAt: '', categoryId: '', location: '' })
const showForm = ref(false)
const adding = ref(false)
const errorMsg = ref('')

const todayCount = ref(0)

async function refresh() {
  loading.value = true
  try {
    const today = new Date().toISOString().slice(0, 10)
    const [schData, catData] = await Promise.all([
      listSchedules({ from: today }),
      listScheduleCategories()
    ])
    schedules.value = schData?.items || []
    categories.value = catData?.items || []
    todayCount.value = schedules.value.filter(s => s.startAt?.startsWith(today)).length
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function addSchedule() {
  const title = newForm.value.title.trim()
  if (!title || !newForm.value.startAt) return
  adding.value = true
  errorMsg.value = ''
  try {
    const cat = categories.value.find(c => c.id === newForm.value.categoryId)
    await createSchedule({
      title,
      startAt: newForm.value.startAt,
      endAt: newForm.value.endAt || null,
      categoryId: newForm.value.categoryId || null,
      categoryName: cat?.name || null,
      location: newForm.value.location || null,
      status: 'active'
    })
    newForm.value = { title: '', startAt: '', endAt: '', categoryId: '', location: '' }
    showForm.value = false
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '添加失败'
  } finally {
    adding.value = false
  }
}

async function toggleStatus(sch) {
  try {
    if (sch.status === 'cancelled') {
      await restoreSchedule(sch.id)
    } else {
      await cancelSchedule(sch.id)
    }
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '操作失败'
  }
}

async function removeSchedule(id) {
  if (!confirm('确定删除这条日程吗？')) return
  try {
    await deleteSchedule(id)
    await refresh()
  } catch (e) {
    errorMsg.value = e?.message || '删除失败'
  }
}

let stopListening = () => {}

onMounted(() => {
  refresh()
  stopListening = listenDataChanged((detail) => {
    if (detail?.schedule) refresh()
  })
})

onBeforeUnmount(() => {
  stopListening()
})
</script>

<template>
  <div class="shome">
    <!-- 摘要 -->
    <div class="ssummary card" style="background: var(--schedule-tint);">
      <div class="ssumText">今天有 <strong>{{ todayCount }}</strong> 项安排</div>
    </div>

    <!-- 快速新增 -->
    <div class="squick card">
      <div class="squickHead">
        <div class="squickTitle">新增安排</div>
        <button class="primary" @click="showForm = !showForm">{{ showForm ? '取消' : '新增' }}</button>
      </div>
      <div v-if="showForm" class="squickForm">
        <input v-model="newForm.title" placeholder="标题" />
        <div class="squickRow">
          <input v-model="newForm.startAt" type="datetime-local" />
          <input v-model="newForm.endAt" type="datetime-local" placeholder="结束时间（可选）" />
        </div>
        <div class="squickRow">
          <select v-model="newForm.categoryId">
            <option value="">类目</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <input v-model="newForm.location" placeholder="地点（可选）" />
        </div>
        <button class="primary" :disabled="adding || !newForm.title.trim() || !newForm.startAt" @click="addSchedule">
          {{ adding ? '保存中…' : '保存' }}
        </button>
        <div v-if="errorMsg" class="serr">{{ errorMsg }}</div>
      </div>
    </div>

    <!-- 日程列表 -->
    <div class="slist card">
      <div class="slistHead">
        <div class="slistTitle">最近日程</div>
        <button class="ghost" @click="$emit('go', 'category')">管理类目</button>
      </div>
      <div v-if="schedules.length === 0 && !loading" class="sempty">还没有日程安排</div>
      <div v-else class="sitems">
        <div v-for="s in schedules" :key="s.id" class="sitem" :class="{ cancelled: s.status === 'cancelled' }">
          <span class="sitemTime">{{ s.startAt?.replace('T', ' ') }}</span>
          <div class="sitemMain">
            <span class="sitemTitle">{{ s.title }}</span>
            <div class="sitemMeta">
              <span class="sitemCat" v-if="s.categoryName">{{ s.categoryName }}</span>
              <span class="sitemLoc" v-if="s.location">{{ s.location }}</span>
            </div>
          </div>
          <div class="sitemActions">
            <button class="ghost" @click="toggleStatus(s)">{{ s.status === 'cancelled' ? '恢复' : '取消' }}</button>
            <button class="ghost sdel" @click="removeSchedule(s.id)">删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shome{ height: 100%; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 4px; }
.shome::-webkit-scrollbar{ width: 4px; }
.shome::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.08); border-radius: 999px; }

.ssummary{ background: var(--schedule-tint); padding: 12px 20px; text-align: center; }
.ssumText{ font-size: 15px; }

.squick{ padding: 12px 20px; }
.squickHead{ display: flex; justify-content: space-between; align-items: center; }
.squickTitle{ font-weight: 700; }
.squickForm{ margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.squickForm > input:first-child,
.squickForm > .squickRow:first-of-type,
.squickForm > button,
.squickForm > .serr{ grid-column: 1 / -1; }
.squickRow{ display: flex; gap: 8px; }
.serr{
  padding: 8px 12px; border-radius: 10px;
  border: 1px solid rgba(217,106,92,.25);
  background: rgba(217,106,92,.06);
  color: var(--danger); font-size: 12px;
}

.slist{ padding: 12px 20px; }
.slistHead{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.slistTitle{ font-weight: 700; }
.sempty{ color: var(--muted); font-size: 13px; padding: 10px 0; }
.sitems{ display: flex; flex-direction: column; gap: 4px; }
.sitem{
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px 14px; border-radius: 10px;
  border: 1px solid var(--border); font-size: 13px;
}
.sitem:hover{ background: var(--surface-2); }
.sitem.cancelled{ opacity: .4; }
.sitemTime{ color: var(--muted); font-size: 12px; white-space: nowrap; }
.sitemMain{ min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.sitemTitle{ font-weight: 500; }
.sitemMeta{ display: flex; gap: 6px; align-items: center; }
.sitemCat{ font-size: 11px; color: var(--muted); padding: 2px 8px; border: 1px solid var(--border); border-radius: 999px; }
.sitemLoc{ font-size: 11px; color: var(--muted); }
.sitemActions{ display: flex; gap: 6px; opacity: 0; transition: opacity .15s; }
.sitem:hover .sitemActions{ opacity: 1; }
.sdel{ color: var(--danger); }
</style>
