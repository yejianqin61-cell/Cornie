# task-036m 死代码清理与能力接线

## 1. Where this task sits

- **批次 C 发布前界面收口**，目标是界面状态可感知、可访问，壳层不撒谎，代码不留死物。
- **本任务移动 P-13 ← D-13 死代码与未接能力**：删除死组件与死接口，补日期摘要与导出入口。
- **Starts after**：C-1 状态层。**Waits on it**：C-3 工程规范收尾。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/MemoryHint.vue`、`ChatDaySummary.vue`、`AskBackBubble.vue`、`ChatEmptyState.vue` — 四个零引用组件。
- `src/renderer/api/chatlog.js`、`conversation.js` — `deleteChatDay`、`getConversation`、`deleteConversation` 无 UI 调用。
- `electron/backend/chatlog/routes.js:80-97` — 当日导出接口的路径与响应形状。
- `src/renderer/components/chat/ChatHistoryPage.vue` — 摘要区与导出按钮的落点。

**Settled**

- 死组件直接删除，不接线；记忆引用提示留到有真实数据源时再做。
- 摘要区用简单状态条，不复活 `ChatDaySummary` 的展开交互。
- 导出走浏览器 Blob 下载，不新增依赖。

**Edges and seam**

- 触及 chat 目录、chat/conversation API、`ChatHistoryPage`。
- 缝：`exportChatDay(date)` 与摘要条；不改服务端。

**Run**

- `npx vitest run src/renderer/components/chat src/renderer/api`
- `npx eslint src/renderer/components/chat src/renderer/api`

**Unknowns**

- 导出接口返回的是 JSON 包装（filename/content），不是文件流。若字段与代码不一致，停止并报告。

## 3. The workflow

1. 读四个入口，复述任务。
2. 先写红测试：摘要条显示日期与消息数。
3. 实现摘要条，测试转绿。
4. 先写红测试：点击导出生成正确文件名的下载。
5. 实现 `exportChatDay` 与下载动作，测试转绿。
6. 先写红测试：四个死组件文件不存在，API 不再导出未用函数。
7. 删除死组件与死接口，跑测试与 eslint，提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 一天 3 条消息 | 摘要显示 3 条 | `ChatHistoryPage` |
| 2 | 点击导出 | 以 `chatlog-2026-10-23.json` 触发下载 | `exportChatDay()` |
| 3 | 死组件集合 | 四个文件都不存在 | 文件系统 |
| 4 | `chatlog.js` | 不再导出 `deleteChatDay` | 模块导出 |
| 5 | `conversation.js` | 不再导出 `getConversation`、`deleteConversation` | 模块导出 |
