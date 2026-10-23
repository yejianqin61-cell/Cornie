# task-036a 首启与空白日的消息可见

## 1. Where this task sits

- **批次 A 对话模块正确性收口**，目标是让首启、长日、失败、确认四条主路径在界面里可见可用。
- **本任务移动 P-1 ← D-1 首启发送后消息消失**：空历史时也能看到用户气泡与流式回复，发送后重拉日期与历史。
- **Starts after**：A-2 默认今天。**Waits on it**：A-3 分页。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/ChatHistoryPage.vue` — loading / error / empty / messages 四分支与 transient 渲染位置。
- `src/renderer/components/chat/ChatPanel.vue` — 发送成功后的刷新顺序。
- `src/renderer/components/chat/ChatPanel.test.js` — 现有发送用例的 mock 方式。
- `doc/Cornie-036-对话模块前端审计报告.md` 的 D-1、D-11 — 首启消失的运行时证据。

**Settled**

- 空态只在“历史为空且没有 transient”时出现。
- 发送成功后先重拉日期列表，再刷新历史。
- 不改后端落库顺序。

**Edges and seam**

- 触及 `ChatHistoryPage.vue`、`ChatPanel.vue`。
- 缝：`ChatHistoryPage` 的渲染分支与 `handleSend` 的完成回调。

**Run**

- `npx vitest run src/renderer/components/chat`
- `npx eslint src/renderer/components/chat`

**Unknowns**

- 发送完成后 transient 清空与历史刷新之间可能闪一帧空态。若无法用 nextTick 消除，停止并报告。

## 3. The workflow

1. 读文件并复述任务。
2. 先写红测试：历史为空、transient 有两条时渲染两行且不出现空态。
3. 调整模板分支，测试转绿。
4. 先写红测试：发送成功后 `listChatDays` 被再次调用。
5. 调整完成回调顺序，测试转绿。
6. 跑测试与 eslint，提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | `messages=[]`、transient 两条 | 渲染 2 行、无空态 | `ChatHistoryPage` |
| 2 | `messages=[]`、transient 为空 | 出现空态 | `ChatHistoryPage` |
| 3 | 发送流完成 | 再次调用 `listChatDays` | `handleSend()` |
| 4 | 发送流完成 | 先刷新日期再刷新历史 | `handleSend()` |
