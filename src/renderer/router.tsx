import { createHashRouter, Navigate, type RouteObject } from 'react-router-dom'

import App from './App'
import ChatHome from './pages/ChatHome'
import ChatHistoryPage from './pages/ChatHistoryPage'
import ChatDayViewPage from './pages/ChatDayViewPage'
import DiaryHomePage from './pages/DiaryHomePage'
import DiaryEditorPage from './pages/DiaryEditorPage'
import DiaryCornieReviewPage from './pages/DiaryCornieReviewPage'
import OnThisDayPage from './pages/OnThisDayPage'
import LedgerHomePage from './pages/LedgerHomePage'
import TodoHomePage from './pages/TodoHomePage'
import ScheduleHomePage from './pages/ScheduleHomePage'
import ObserveMemoryHomePage from './pages/ObserveMemoryHomePage'
import ObservationListPage from './pages/ObservationListPage'
import ObservationDetailPage from './pages/ObservationDetailPage'
import MemoryWikiHomePage from './pages/MemoryWikiHomePage'
import SettingsHomePage from './pages/SettingsHomePage'
import DeepseekConfigPage from './pages/DeepseekConfigPage'
import AdvancedSettingsPage from './pages/AdvancedSettingsPage'

// 路由是唯一导航事实源（hash 模式，兼容 Electron file:// 与 vite dev），
// 与 Vue 版 router.js 的 17 条路由一一对应。
export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/chat" replace /> },
  { path: '/chat', element: <ChatHome /> },
  { path: '/chat/history', element: <ChatHistoryPage /> },
  { path: '/chat/day/:date', element: <ChatDayViewPage /> },
  { path: '/diary', element: <DiaryHomePage /> },
  { path: '/diary/editor', element: <DiaryEditorPage /> },
  { path: '/diary/cornie-review', element: <DiaryCornieReviewPage /> },
  { path: '/diary/on-this-day', element: <OnThisDayPage /> },
  { path: '/ledger', element: <LedgerHomePage /> },
  { path: '/todo', element: <TodoHomePage /> },
  { path: '/schedule', element: <ScheduleHomePage /> },
  { path: '/observe', element: <ObserveMemoryHomePage /> },
  { path: '/observe/list', element: <ObservationListPage /> },
  { path: '/observe/detail/:id', element: <ObservationDetailPage /> },
  { path: '/memory', element: <MemoryWikiHomePage /> },
  { path: '/settings', element: <SettingsHomePage /> },
  { path: '/settings/deepseek', element: <DeepseekConfigPage /> },
  { path: '/settings/advanced', element: <AdvancedSettingsPage /> },
  // 兜底：未知路径回聊天
  { path: '*', element: <Navigate to="/chat" replace /> },
]

export function createAppRouter() {
  return createHashRouter([
    {
      element: <App />,
      children: routes,
    },
  ])
}

export const router = createAppRouter()
