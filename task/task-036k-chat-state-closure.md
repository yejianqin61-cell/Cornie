# task-036k 失败与取消闭环

## 1. Where this task sits

- **批次 B 对话阅读与交互收口**，目标是让聊天页像工作台：可读、可导航、可恢复。
- **本任务移动 P-11 ← D-11 失败、取消、竞态无反馈**：失败气泡可重试、取消可解释、刷新失败不误报、切日期不串台、流必须收到 done。
- **Starts after**：B-2 正文、B-3 输入、B-5 滚动。**Waits on it**：批次 C 视觉统一。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/ChatPanel.vue` — 发送 try/catch、取消、刷新顺序。
- `src/renderer/components/chat/ChatHistoryPage.vue` — 加载请求与 transient 渲染。
- `src/renderer/api/client.js:36-79` — SSE 读取与 error 事件处理。
- `electron/backend/agent/orchestrator.js:150-170,362-402` — 先落用户消息、失败兜底。
- `doc/Cornie-036-对话模块前端审计报告.md` 的 D-11 — 失败与取消的审计证据。

**Settled**

- 失败的用户消息保留在对话里，并标“发送失败 / 重试”。
- 取消后刷新历史并给出“已取消”说明；不恢复草稿造成重复发送。
- 历史刷新失败与发送失败分开表达。
- 流没有收到 `done` 就结束，视为失败。

**Edges and seam**

- 触及 `api/client.js`、`ChatPanel.vue`、`ChatHistoryPage.vue`、`MessageRow.vue`。
- 缝：`apiStream()` 的完成语义、`handleSend()` 的分支、`load()` 的请求序号。

**Run**

- `npx vitest run src/renderer/components/chat src/renderer/api`
- `npx eslint src/renderer/api src/renderer/components/chat`

**Unknowns**

- 取消时后端是否已落库取决于时序。若前端无法可靠区分，停止并报告，不要猜。

## 3. The workflow

1. 读文件并复述任务。
2. 先写红测试：失败后保留用户气泡并显示重试；重试只发一次。
3. 实现失败气泡与重试，测试转绿。
4. 先写红测试：取消后刷新历史、显示“已取消”、不恢复草稿。
5. 实现取消分支，测试转绿。
6. 先写红测试：历史刷新失败不覆盖发送成功、旧请求不覆盖新日期、无 done 的流视为失败。
7. 实现三处修正，跑测试与 eslint，提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 流返回错误 | 用户气泡保留并标失败，出现重试 | `handleSend()` |
| 2 | 点击重试 | 只发一次，成功后清除失败态 | `handleSend()` |
| 3 | 流进行中取消 | 刷新历史、提示已取消、草稿为空 | `handleSend()` |
| 4 | 历史刷新失败 | 不显示发送失败，不清空已发出的消息 | `handleSend()` |
| 5 | 两次日期加载乱序完成 | 只保留最后一次的结果 | `load()` |
| 6 | 流结束但无 done | 视为失败并提示 | `apiStream()` |
| 7 | transient 属于其它日期 | 不在当前日期渲染 | `ChatHistoryPage` |
