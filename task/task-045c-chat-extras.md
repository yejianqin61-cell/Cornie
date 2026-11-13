# task-045c 聊天展示联想话语，工具结果刷新后保留

## 1. Where this task sits

- **Phase 5 后端已有的能力都能在界面用上**，目标是主人能在界面上管理三域类目、编辑日程、搜索聊天，看到联想话语和关联记忆，不再需要通过对话绕路。
- **本任务推进 R-12 聊天展示联想话语，工具结果刷新后不消失**。
- **Starts after**：task-045b 待办与日程的类目管理。**Waits on**：task-045d 观察详情展示关联记忆。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/ChatPanel.vue` 的 `handleSend` — 完成回调只把 `confirm`、`toolResults` 写到临时助手消息上，随后清空临时消息并刷新历史。
- `src/renderer/components/chat/ChatHistoryPage.vue` 的 `attachConfirmations` 和 `load` — 历史消息怎么附加确认卡，工具结果为什么刷新后就没了。
- `src/renderer/components/chat/MessageRow.vue` — 消息行怎么渲染文本、工具结果、确认卡。
- `electron/backend/agent/orchestrator.js` 返回值里的 `interimReplies` 与 `cornieMessage` — 完成事件里 `result.cornieMessage.id` 是本轮回复的消息 ID。
- `src/renderer/components/chat/ChatPanel.test.js`、`ChatHistoryPage.test.js` — 现有测试写法。

**Settled**

- 联想话语 `interimReplies` 是钻取轮产生的话，现状是后端返回但前端不渲染。
- 本任务不改后端。"工具结果与联想话语"只在本次应用会话内保留：不跨应用重启持久化（那需要后端存储，不在本计划内；界面和文档都不应暗示它会跨重启保留）。
- 保留方式固定：`ChatPanel` 持有 `messageExtras`（键为 Cornie 回复的消息 ID，值 `{ toolResults, interimReplies }`），在完成回调里按 `result.cornieMessage.id` 写入；以属性 `extras` 传给 `ChatHistoryPage`，后者在加载历史后把它附加到对应消息（与确认卡同样的方式）。
- `MessageRow` 新增：`message.interimReplies`（字符串数组）在回复正文之前逐条显示，每条一行，类名 `msg-row-interim`；临时助手消息也要带上（完成回调里写 `assistant.interimReplies`）。
- 切换日期再切回，同一应用会话内仍然保留（因为 `extras` 在 `ChatPanel` 里，不随历史页重新加载而丢失）。

**Edges and seam**

- Seam：`ChatPanel.test.js`（挂载面板、mock `sendMessageStreamed`）与 `ChatHistoryPage.test.js`。不新增 seam。
- 改 `ChatPanel.vue`、`ChatHistoryPage.vue`、`MessageRow.vue` 和这两个测试文件。

**Run**

- `npx vitest run src/renderer/components/chat`
- `npm run lint`

**Unknowns**

- 如果完成事件的结果里没有 `cornieMessage.id`（例如回放分支），把 `extras` 写入跳过，不要自己造 ID。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：把联想话语渲染出来，并让工具结果在历史刷新后仍然挂在原来的回复上。
2. 先写 Case 1 至 Case 4 的红测试。
3. `MessageRow` 渲染 `interimReplies`。
4. `ChatHistoryPage` 接收 `extras` 并在加载后附加。
5. `ChatPanel` 维护 `messageExtras`，在完成回调里写入，并把联想话语写到临时助手消息上。
6. 运行第 2 部分的两条命令。
7. 提交：`feat(chat): show associative replies and keep tool results after refresh`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | `MessageRow` 收到 `interimReplies: ['哦对……她是你高中同桌。']` 与正文 `想起她了` | 先显示联想话语一行，再显示正文 | `MessageRow` |
| 2 | 流式发送的完成结果含 `interimReplies` 与 `cornieMessage.id: 'c1'` | 完成时临时助手消息显示联想话语 | `ChatPanel` |
| 3 | 完成结果含 `toolExecution.results` 与 `cornieMessage.id: 'c1'`，历史刷新后返回 id 为 `c1` 的助手消息 | 刷新后该消息仍显示工具结果面板 | `ChatPanel` |
| 4 | 先发送一轮，切到前一天再切回今天 | 该消息的工具结果仍在 | `ChatPanel` |
| 5 | `ChatHistoryPage` 收到 `extras` 且消息 id 不匹配 | 其他消息不受影响，没有多余的面板 | `ChatHistoryPage` |

联想话语与工具名称是测试里写死的字面量。
