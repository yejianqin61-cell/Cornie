<script setup>
import { onMounted, ref } from 'vue'
import { listMemoryWikiPages } from '../api'

const recentMemories = ref([])
const loadingMemories = ref(false)

onMounted(async () => {
  loadingMemories.value = true
  try {
    const data = await listMemoryWikiPages({ pageType: 'memory', limit: 5 })
    recentMemories.value = (data?.pages || []).slice(0, 5)
  } catch {
    recentMemories.value = []
  } finally {
    loadingMemories.value = false
  }
})

function truncated(text, maxLen = 80) {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}
</script>

<template>
  <div class="omPage">
    <!-- 温和引导区 -->
    <div class="omIntro card">
      <div class="omIntroIcon">🌟</div>
      <div class="omIntroTitle">想记住的小事</div>
      <div class="omIntroText">
        这里是你想记住的生活片段。铃湾也会帮你把重要的东西记下来。<br />
        和铃湾聊天时提到的事，她会自动帮你整理成记忆。
      </div>
    </div>

    <!-- 快速记观察 -->
    <div class="omQuick card">
      <div class="omQuickTitle">记下一件小事</div>
      <div class="omQuickHint">
        去<a href="#" @click.prevent="$emit('goChat')">聊天</a>
        页告诉铃湾你想记住什么，她会帮你整理好。比如"我今天去了一个新咖啡馆"。
      </div>
    </div>

    <!-- 重要记忆入口 -->
    <div class="omMemories card">
      <div class="omMemoriesHead">
        <div class="omMemoriesTitle">铃湾帮你记住的事</div>
        <button class="ghost" @click="$emit('go', 'memory-list')">查看全部</button>
      </div>

      <div v-if="loadingMemories" class="omLoading">正在翻翻记忆…</div>
      <div v-else-if="recentMemories.length === 0" class="omEmpty">
        <div class="omEmptyIcon">📝</div>
        <div class="omEmptyText">铃湾还在慢慢记住关于你的事</div>
        <div class="omEmptyHint">多和铃湾聊聊天，她会帮你记住重要的东西</div>
      </div>
      <div v-else class="omMemoryList">
        <div
          v-for="mem in recentMemories"
          :key="mem.id"
          class="omMemoryCard"
          @click="$emit('go', 'memory-detail', mem.id)"
        >
          <div class="omMemoryTitle">{{ mem.title }}</div>
          <div class="omMemorySnippet" v-if="mem.summary">{{ truncated(mem.summary, 100) }}</div>
          <div class="omMemorySnippet" v-else>{{ truncated(mem.content, 100) }}</div>
        </div>
      </div>
    </div>

    <!-- 观察记录入口 -->
    <div class="omObserve card">
      <div class="omObserveHead">
        <div class="omObserveTitle">最近的观察记录</div>
        <button class="ghost" @click="$emit('go', 'observation-list')">查看全部</button>
      </div>
      <div class="omObserveHint">
        铃湾在和你聊天时自动记录的生活片段，去<a href="#" @click.prevent="$emit('go', 'observation-list')">观察记录</a>页面查看。
      </div>
    </div>
  </div>
</template>

<style scoped>
.omPage{
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-right: 4px;
}
.omPage::-webkit-scrollbar{ width: 4px; }
.omPage::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.08); border-radius: 999px; }

/* ─── 引导区 ─── */
.omIntro{
  background: var(--memory-tint);
  padding: 28px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.omIntroIcon{ font-size: 40px; }
.omIntroTitle{ font-size: 20px; font-weight: 800; }
.omIntroText{
  font-size: 14px;
  color: var(--muted);
  line-height: 1.7;
  max-width: 500px;
}

/* ─── 快速记观察 ─── */
.omQuick{ padding: 18px 20px; }
.omQuickTitle{ font-weight: 700; font-size: 15px; margin-bottom: 8px; }
.omQuickHint{ font-size: 13px; color: var(--muted); line-height: 1.6; }
.omQuickHint a{ color: var(--accent); }

/* ─── 记忆区 ─── */
.omMemories{ padding: 16px 20px; }
.omMemoriesHead{
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.omMemoriesTitle{ font-weight: 700; }

.omLoading{ text-align: center; color: var(--muted); padding: 20px; font-size: 13px; }
.omEmpty{
  text-align: center;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.omEmptyIcon{ font-size: 28px; }
.omEmptyText{ font-size: 14px; color: var(--muted); }
.omEmptyHint{ font-size: 12px; color: var(--muted); }

.omMemoryList{ display: flex; flex-direction: column; gap: 8px; }
.omMemoryCard{
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  cursor: pointer;
  transition: background .15s;
}
.omMemoryCard:hover{ background: var(--surface-2); }
.omMemoryTitle{ font-weight: 600; font-size: 14px; }
.omMemorySnippet{
  font-size: 13px;
  color: var(--muted);
  margin-top: 4px;
  line-height: 1.5;
}

/* ─── 观察区 ─── */
.omObserve{ padding: 16px 20px; }
.omObserveHead{
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.omObserveTitle{ font-weight: 700; }
.omObserveHint{ font-size: 13px; color: var(--muted); line-height: 1.6; }
.omObserveHint a{ color: var(--accent); }
</style>
