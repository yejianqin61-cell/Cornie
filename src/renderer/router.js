import { createRouter, createWebHashHistory } from 'vue-router'

import ChatHome from './components/ChatHome.vue'
import ChatHistory from './ChatHistory.vue'
import ChatDayView from './components/ChatDayView.vue'
import DiaryHome from './components/DiaryHome.vue'
import DiaryEditor from './components/DiaryEditor.vue'
import CornieDiaryReview from './components/CornieDiaryReview.vue'
import OnThisDayPage from './components/OnThisDayPage.vue'
import LedgerHome from './components/LedgerHome.vue'
import TodoHome from './components/TodoHome.vue'
import ScheduleHome from './components/ScheduleHome.vue'
import ObserveMemoryHome from './components/ObserveMemoryHome.vue'
import ObservationList from './components/ObservationList.vue'
import ObservationDetail from './components/ObservationDetail.vue'
import MemoryWikiHome from './components/MemoryWikiHome.vue'
import SettingsHome from './components/SettingsHome.vue'
import DeepseekConfig from './components/DeepseekConfig.vue'
import AdvancedSettings from './components/AdvancedSettings.vue'

// F-05：路由是唯一导航事实源（hash 模式，兼容 Electron file:// 与 vite dev）。
// 子视图也入路由（不再用 App.vue 里的字符串 ref 栈），刷新/深链可直接定位。
export const routes = [
  { path: '/', redirect: '/chat' },
  { path: '/chat', name: 'chat', component: ChatHome },
  { path: '/chat/history', name: 'chat-history', component: ChatHistory },
  {
    path: '/chat/day/:date',
    name: 'chat-day',
    component: ChatDayView,
    props: (route) => ({ date: route.params.date || '', focusMessageId: route.query.focus || '' }),
  },
  { path: '/diary', name: 'diary', component: DiaryHome },
  { path: '/diary/editor', name: 'diary-editor', component: DiaryEditor },
  { path: '/diary/cornie-review', name: 'diary-cornie-review', component: CornieDiaryReview },
  { path: '/diary/on-this-day', name: 'diary-on-this-day', component: OnThisDayPage },
  { path: '/ledger', name: 'ledger', component: LedgerHome },
  { path: '/todo', name: 'todo', component: TodoHome },
  { path: '/schedule', name: 'schedule', component: ScheduleHome },
  { path: '/observe', name: 'observe', component: ObserveMemoryHome },
  { path: '/observe/list', name: 'observe-list', component: ObservationList },
  { path: '/observe/detail/:id', name: 'observe-detail', component: ObservationDetail, props: true },
  { path: '/memory', name: 'memory', component: MemoryWikiHome },
  { path: '/settings', name: 'settings', component: SettingsHome },
  { path: '/settings/deepseek', name: 'settings-deepseek', component: DeepseekConfig },
  { path: '/settings/advanced', name: 'settings-advanced', component: AdvancedSettings },
  // 兜底：未知路径回聊天
  { path: '/:pathMatch(.*)*', redirect: '/chat' },
]

export function createAppRouter() {
  return createRouter({
    history: createWebHashHistory(),
    routes,
  })
}
