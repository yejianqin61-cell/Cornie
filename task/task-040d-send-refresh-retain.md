# task-040d 历史刷新失败保留消息

## 1. Where this task sits

- **阶段 1 一次发送只写入一次**，目标是断流或刷新失败后消息可见且不重复落库。
- **本任务推进 R-7 刷新失败保留已发送气泡**，让已完成发送不被读取错误覆盖。
- **Starts after**：040b 请求标识传递与 040c 会话写入按请求去重。**Waits on it**：阶段回归验证。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/ChatPanel.vue` — 流完成、刷新和清理临时消息的顺序。
- `src/renderer/components/chat/ChatHistoryPage.vue` — 临时消息与历史消息如何合并显示。
- `src/renderer/components/chat/ChatPanel.test.js` — 当前刷新失败的已固化行为。
- `src/renderer/components/chat/ChatPanel.integration.test.js` — 真实子组件下的发送回显。

**Settled**

- 历史刷新失败时已完成的用户和助手消息继续显示。
- 历史读取成功后按请求标识交接显示，不能根据正文猜测重复。
- 失败提示仍说明历史未刷新，不能伪装成发送失败。

**Edges and seam**

- 触及对话页面的临时消息状态和历史显示。
- Seam：现有 `ChatPanel` 集成测试，不新增页面测试入口。

**Run**

- `npx vitest run src/renderer/components/chat/ChatPanel.test.js`
- `npx vitest run src/renderer/components/chat/ChatPanel.integration.test.js`
- `npm.cmd run lint`

**Unknowns**

- 历史响应中的请求标识需要由 040c 返回；若没有，停止而不使用正文去重。
- 取消场景的现有清理语义不在本任务中改变。

## 3. The workflow

1. 阅读第 2 部分文件，并复述“读取失败不抹掉已确认发送”。
2. 把当前刷新失败的断言改为保留两条临时消息，得到红测试。
3. 用带请求标识的历史响应写交接去重测试。
4. 调整流完成后的清理时机，让失败读取保留回显。
5. 让成功读取按标识接管消息，并保留原有通知。
6. 运行组件和集成测试，确认失败与成功路径均通过。
7. 提交刷新回显变更。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 流完成、历史读取失败 | 用户和助手消息仍可见 | `ChatPanel` 集成测试 |
| 2 | 后续历史读取成功 | 同一轮消息只显示一次 | `ChatPanel` 集成测试 |
| 3 | 历史读取失败 | 显示历史刷新提示而非发送失败 | `ChatPanel` 组件测试 |
| 4 | 用户取消生成 | 保持既有取消回显 | `ChatPanel` 组件测试 |
