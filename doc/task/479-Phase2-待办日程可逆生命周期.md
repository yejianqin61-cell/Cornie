# 479 Phase 2 待办日程可逆生命周期

## 1. Where this task sits

- **Phase 2 日常业务都能真实落库**：目标是一个工作日的六类业务能保存并重载。
- 本任务落实 **R-5 修正待办与日程的生命周期业务链**，补齐状态展示和可逆动作。
- 可与任务 478 并行；完成后跨模块演示能创建、变更和重载待办日程。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/todo/TodoHomePage.vue` — 完成与重开现在如何刷新和失败。
- `src/renderer/components/schedule/ScheduleHomePage.vue` — 取消与恢复现在如何刷新和失败。
- `src/renderer/components/todo/TodoList.vue` — 状态决定哪些按钮可见。
- `src/renderer/components/schedule/ScheduleList.vue` — 日程状态决定哪些按钮可见。
- `electron/backend/todo/routes.js` 与 `schedule/routes.js` — 生命周期端点的真实状态词。

**Settled**

- 待办使用 complete 与 reopen；日程使用 cancel 与 restore。
- 每次成功动作都重载当前视图。
- 已完成或已取消状态必须提供其唯一的逆操作。

**Edges and seam**

- 接缝是列表组件事件到既有 Todo/Schedule API。
- 不加入类别高级管理或日程编辑器重做。

**Run**

- `npx vitest run src/renderer/components/todo/todo.test.js src/renderer/components/schedule/schedule.test.js --maxWorkers=1`
- `npm run test:full`
- `npm run build`。

**Unknowns**

- 若后端状态名与列表展示不同，在 API 边界翻译，不改服务存储词。
- 若逆操作端点缺失，停止并报告；不得前端伪造状态。

## 3. The workflow

1. 阅读第 2 部分，复述：每个终态都能看见并通过真实端点撤回。
2. 为待办完成后重开写失败测试。
3. 为日程取消后恢复写失败测试。
4. 补状态条件与成功刷新，产出可逆生命周期。
5. 为动作失败添加可见状态，运行三个命令并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 完成待办 | open ID | 显示 completed | `completeTodo()` |
| 重开待办 | completed ID | 回到 open | `reopenTodo()` |
| 取消日程 | upcoming ID | 显示 cancelled | `cancelSchedule()` |
| 恢复日程 | cancelled ID | 回到 upcoming | `restoreSchedule()` |
| 动作失败 | 500 响应 | 显示重试入口 | 两个 Home 页面 |
