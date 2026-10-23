# task-036l 状态层复用与可访问性

## 1. Where this task sits

- **批次 C 发布前界面收口**，目标是界面状态可感知、可访问，壳层不撒谎，代码不留死物。
- **本任务移动 P-12 ← D-12 空/错/载状态与可访问性缺失**：复用通用状态组件，补齐地标与播报。
- **Starts after**：批次 B 完成。**Waits on it**：C-2 的摘要区、C-4 的壳层清理。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/ChatHistoryPage.vue` — 四个渲染分支与自定义错误按钮。
- `src/renderer/components/common/EmptyState.vue`、`ErrorState.vue`、`LoadingState.vue` — 复用时的 props 与配色。
- `src/renderer/components/layout/CornieLayout.vue` — 主内容区当前是 `div`。
- `src/renderer/styles/main.css` — 全局 `:focus-visible` 缺失。
- `doc/Cornie-036-对话模块前端审计报告.md` 的 D-12 — 对比度、aria 与 h1 的证据。

**Settled**

- 聊天页不引入 `PageHeader`，只补视觉隐藏的 h1 与 `main` 地标。
- 空态区分“今天”与“历史某天”，文案保持状态描述而非功能说明。
- 通用状态组件 props 保持向后兼容，不改其它模块调用方式。

**Edges and seam**

- 触及 chat 历史页、common 三个状态组件、CornieLayout、全局 CSS。
- 缝：`ChatHistoryPage` 的渲染分支与状态组件根元素的 role；不改路由与数据层。

**Run**

- `npx vitest run src/renderer/components/chat src/renderer/components/common src/renderer/components/layout src/renderer/styles`
- `npx eslint src/renderer/components src/renderer/styles`

**Unknowns**

- `EmptyState` 的 icon prop 当前只接受 Object，Lucide 图标是函数组件。若改成联合类型后其它调用方告警，先修类型再继续。

## 3. The workflow

1. 读五个文件，复述任务。
2. 先写红测试：错误态复用 `ErrorState` 且重试会重新加载。
3. 替换错误分支，测试转绿。
4. 先写红测试：空态区分今天/历史；消息区有 `role="log"` 与 `aria-live`；加载有 `role="status"`。
5. 改 chat 历史页与三个通用状态组件，测试转绿。
6. 先写红测试：`main` 地标与视觉隐藏 h1 存在；全局有 `:focus-visible`。
7. 改布局与 CSS，跑测试与 eslint，提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 历史加载失败 | 出现 `ErrorState`，点击重试再次请求 | `ChatHistoryPage` |
| 2 | 今天无消息 | 文案为今天空态 | `ChatHistoryPage` |
| 3 | 历史某天无消息 | 文案为历史空态 | `ChatHistoryPage` |
| 4 | 消息列表 | `role=log` 且 `aria-live=polite` | `ChatHistoryPage` |
| 5 | 加载中 | 状态元素 `role=status` | `ChatHistoryPage` |
| 6 | 渲染布局 | 主内容区是 `main` | `CornieLayout` |
| 7 | 读取 `main.css` | 含 `:focus-visible` | `:root` |
