# 177-Phase3.3-观察日志关联记忆联调

## 目标

观察模块深度联调：ObservationDetailPage 中关联记忆数据的 API 接入，以及 ObservationListPage 详情导航的完整性。

## 当前状态

- ObservationListPage 已调用 listObservations / createObservation / updateObservation / deleteObservation API
- ObservationDetailPage 通过 prop 接收 `observation.memoryLinks`，但后端 observation 对象中已包含此字段
- ObservationLinkedMemory 为纯展示组件
- 后端无独立的 `/api/observations/:id/memory-links` 端点（内嵌在 observation 对象中）

## 改造范围

### 1. ObservationListPage.vue

- `openDetail(id)` 时调用 `getObservation(id)` 获取完整 observation 对象（含 memoryLinks）
- 显示 detail 视图时传递完整 observation 数据
- 详情页展示 loading 态

### 2. ObservationDetailPage.vue

- 新增 `loading` prop，展示骨架屏
- 新增 `error` prop，展示错误提示
- ObservationLinkedMemory 展示从 observation 对象中获取的 memoryLinks

### 3. ObservationLinkedMemory.vue

- 新增点击跳转功能（可选，emit 'navigate' 事件）

### 4. 测试

在 `observation.test.js` 中新增：
- ObservationDetailPage 的 loading/error 状态
- ObservationLinkedMemory 的点击交互

## 验收标准

- [ ] ObservationListPage 详情加载时调用 getObservation API
- [ ] ObservationDetailPage 支持 loading/error 状态
- [ ] ObservationLinkedMemory 数据来自 observation 对象
- [ ] 测试通过
- [ ] `vite build` 通过