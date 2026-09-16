<script setup>
import { ref, computed } from 'vue'
import CornieLayout from './components/layout/CornieLayout.vue'
import CornieSidebarItem from './components/layout/CornieSidebarItem.vue'
import ChatPanel from './components/chat/ChatPanel.vue'
import LedgerHomePage from './components/ledger/LedgerHomePage.vue'
import DiaryHomePage from './components/diary/DiaryHomePage.vue'
import MemoryWikiHomePage from './components/memory/MemoryWikiHomePage.vue'
import ObservationListPage from './components/observe/ObservationListPage.vue'
import TodoHomePage from './components/todo/TodoHomePage.vue'
import ScheduleHomePage from './components/schedule/ScheduleHomePage.vue'
import SettingsPage from './components/settings/SettingsPage.vue'

const activeModule = ref('chat')
const settingsOpen = ref(false)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const sidebarItems = [
  { id: 'chat', icon: 'chat', label: '聊天' },
  { id: 'diary', icon: 'diary', label: '日记' },
  { id: 'memory', icon: 'memory', label: '记忆' },
  { id: 'observe', icon: 'observe', label: '观察' },
  { id: 'ledger', icon: 'ledger', label: '收支' },
  { id: 'todo', icon: 'todo', label: '待办' },
  { id: 'schedule', icon: 'schedule', label: '日程' },
]

function switchModule(id) {
  activeModule.value = id
  settingsOpen.value = false
}

function openSettings() {
  settingsOpen.value = true
}
</script>

<template>
  <CornieLayout>
    <template #sidebar>
      <div class="dashboard-sidebar">
        <div class="dashboard-avatar">
          <img src="/pic/Avatar.png" alt="" />
        </div>
        <div class="dashboard-greeting">{{ greeting }}</div>
        <nav class="dashboard-nav">
          <CornieSidebarItem
            v-for="item in sidebarItems"
            :key="item.id"
            :icon="item.icon"
            :label="item.label"
            :active="item.id === activeModule && !settingsOpen"
            @click="switchModule(item.id)"
          />
        </nav>
        <div class="dashboard-nav-bottom">
          <CornieSidebarItem
            icon="settings"
            label="设置"
            :active="settingsOpen"
            @click="openSettings"
          />
        </div>
      </div>
    </template>

    <SettingsPage v-if="settingsOpen" />
    <ChatPanel v-else-if="activeModule === 'chat'" />
    <DiaryHomePage v-else-if="activeModule === 'diary'" />
    <MemoryWikiHomePage v-else-if="activeModule === 'memory'" />
    <ObservationListPage v-else-if="activeModule === 'observe'" />
    <LedgerHomePage v-else-if="activeModule === 'ledger'" />
    <TodoHomePage v-else-if="activeModule === 'todo'" />
    <ScheduleHomePage v-else-if="activeModule === 'schedule'" />

    <template #status>
      <span>记忆 12</span>
      <span>观察 3</span>
      <span>v0.1.0</span>
    </template>
  </CornieLayout>
</template>

<style scoped>
.dashboard-sidebar {
  width: 120px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 3px solid #000;
}

.dashboard-avatar {
  padding: 10px;
  display: flex;
  justify-content: center;
  border-bottom: 3px solid #000;
}

.dashboard-avatar img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border: 3px solid #000;
}

.dashboard-greeting {
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 700;
  color: #777;
  border-bottom: 3px solid #000;
  text-align: center;
}

.dashboard-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.dashboard-nav-bottom {
  margin-top: auto;
  border-top: 3px solid #000;
}
</style>