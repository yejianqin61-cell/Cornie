# task-036o 壳层诚实性与渲染细节

## 1. Where this task sits

- **批次 C 发布前界面收口**，目标是界面状态可感知、可访问，壳层不撒谎，代码不留死物。
- **本任务移动 P-15 ← D-15 壳层假数据与性能细节**：去掉假统计与假窗口按钮，给长列表加渲染记忆。
- **Starts after**：C-1。**Waits on it**：批次 C 收口。

## 2. What the developer needs to know

**Read first**

- `src/renderer/App.vue:99-103` — 状态栏写死的“记忆 12 / 观察 3”。
- `src/renderer/components/layout/CornieTopBar.vue:13-23` — 无 IPC 的三个窗口按钮。
- `electron/main.js:63-71` — 主窗口仍是系统标题栏，按钮没有事件目标。
- `src/renderer/components/chat/ChatHistoryPage.vue` — 历史消息列表的 `v-for`。

**Settled**

- 窗口控制不接 IPC，直接移除假按钮；保留头像与名称。
- 状态栏不展示未接入的统计，只保留在线状态与版本。
- 渲染优化只加 `v-memo`，不引入虚拟列表。

**Edges and seam**

- 触及 `App.vue`、`CornieTopBar.vue`、`ChatHistoryPage.vue`。
- 缝：壳层模板与消息行的渲染记忆；不改 Electron 主进程。

**Run**

- `npx vitest run src/renderer/components/layout src/renderer/components/chat`
- `npx eslint src/renderer/App.vue src/renderer/components/layout src/renderer/components/chat`

**Unknowns**

- 移除窗口按钮后顶栏是否显得空。若布局退化，补一条右侧版本号而不是保留假按钮。

## 3. The workflow

1. 读四个入口，复述任务。
2. 先写红测试：顶栏不含窗口控制按钮，只保留名称。
3. 移除按钮，测试转绿。
4. 先写红测试：状态栏不含“记忆 12 / 观察 3”。
5. 改状态栏，测试转绿。
6. 先写红测试：历史消息列表使用 `v-memo`。
7. 加渲染记忆，跑测试与 eslint，提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 渲染顶栏 | 没有 Minimize/Maximize/Close 按钮 | `CornieTopBar` |
| 2 | 渲染顶栏 | 仍显示 CORNIE | `CornieTopBar` |
| 3 | 读取 `App.vue` | 不含 `记忆 12`、`观察 3` | 状态栏模板 |
| 4 | 读取 `ChatHistoryPage.vue` | 消息循环带 `v-memo` | 历史列表 |
