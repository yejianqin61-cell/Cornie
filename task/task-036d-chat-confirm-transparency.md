# task-036d 确认卡与工具结果透明层接线

## 1. Where this task sits

- **批次 A 对话模块正确性收口**，目标是让首启、长日、失败、确认四条主路径在界面里可见可用。
- **本任务移动 P-4 ← D-4 确认与透明层不可达**：流式完成结果落进消息，历史附带当日待确认记录，确认卡与工具结果按后端字段渲染。
- **Starts after**：A-3 分页（历史加载稳定）。**Waits on it**：批次 B 的阅读与输入改造。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/ChatPanel.vue` — `sendMessageStreamed` 的 `onDone` 与 transient 结构。
- `src/renderer/components/chat/MessageRow.vue` — `message.confirm` / `message.toolResults` 的消费方式。
- `electron/db.js:518-647` — pending confirmation 的完整字段。
- `electron/backend/confirm/routes.js` — `GET /confirmations?date=` 与 decision 响应。
- `src/renderer/components/chat/ConfirmCard.vue`、`ToolResultPanel.vue` — 现有字段假设。

**Settled**

- 确认卡以后端 `confirmRequest.reason/toolName/arguments` 为准。
- decision 后以服务端返回的 `confirmation.status` 为准，不在前端猜状态。
- 历史里的待确认记录按 `conversationMessageId` 挂到对应消息。

**Edges and seam**

- 触及 chat 目录 4 个组件、`api/confirm.js`、`api/chatlog.js`。
- 缝：`onDone(result)` 与 `listConfirmations(date)`；不改后端。

**Unknowns**

- 后端 decision 响应里 `confirmation.status` 是否总是存在。若缺省，保留前端兜底但记录原因。若字段形状与代码不一致，停止并报告。

## 3. The workflow

1. 读文件并复述任务。
2. 先写红测试：`onDone` 带 `pendingConfirmation/toolExecution` 时，transient 助手消息带 `confirm/toolResults`。
3. 实现 `onDone` 落点，测试转绿。
4. 先写红测试：`ConfirmCard` 用后端形状渲染原因与工具名；`ToolResultPanel` 渲染 `tool_name/ok/result/error.message`。
5. 重写两个展示组件，测试转绿。
6. 先写红测试：历史加载后按 `conversationMessageId` 挂载确认。
7. 实现 `listConfirmations` 与挂载，跑全部 chat 测试与 eslint，提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | done.result 含 pendingConfirmation | 助手 transient 带 `confirm.id` | `onDone()` |
| 2 | done.result 含 toolExecution.results | 助手 transient 带工具结果 | `onDone()` |
| 3 | 后端形状确认 | 显示 reason 与 toolName | `ConfirmCard` |
| 4 | 批准返回 `status=executed` | 卡片显示已执行并锁按钮 | `ConfirmCard` |
| 5 | 工具结果 `ok=false` | 显示 `error.message` | `ToolResultPanel` |
| 6 | 历史消息 + 当日确认 | 确认挂到同 id 消息 | `ChatHistoryPage` |
