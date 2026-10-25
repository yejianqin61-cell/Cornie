# task-040a 断流重试端到端红测试

## 1. Where this task sits

- **阶段 1 一次发送只写入一次**，目标是断流或刷新失败后消息可见且不重复落库。
- **本任务推进 R-4 断流重试不重复写入**，先在真实会话服务入口固定失败行为。
- **Starts after**：无。**Waits on it**：请求标识传递、持久去重和界面回显。

## 2. What the developer needs to know

**Read first**

- `tests/services/phase1-chat-e2e.test.mjs` — 真实本地服务如何建立和读取历史。
- `tests/services/stream-abort.test.mjs` — 客户端断开怎样传到流式服务。
- `electron/backend/conversation/routes.js` — 流式请求的输入和 SSE 完成语义。
- `electron/backend/agent/orchestrator.js` — 用户消息在回复前写入的位置。

**Settled**

- 测试使用现有本地服务和临时数据库，不访问外网。
- 同一发送尝试在重试时必须携带同一请求标识，来源是 041 阶段 1。
- 此任务只固定行为，不修改生产代码。

**Edges and seam**

- 触及服务端到端测试，保留路由和数据库实现。
- Seam：现有对话服务端到端入口，不新增测试入口。

**Run**

- `node tests/services/phase1-chat-e2e.test.mjs`
- `npm.cmd run lint`

**Unknowns**

- 若断开无法稳定发生在用户消息写入后，改用可控模型替身。
- 若现有服务缝不能表达重试标识，停止并交给下一任务处理。

## 3. The workflow

1. 阅读第 2 部分文件，并复述“同一重试不得写入两条用户消息”。
2. 在现有端到端服务测试中加入一次保存后的断流场景。
3. 用相同请求标识重试该场景，并读取当天历史。
4. 断言用户消息数为一，作为当前实现的红测试。
5. 运行本任务命令并确认测试失败原因是重复写入或缺少标识。
6. 提交红测试，不修改生产代码。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 保存用户消息后断流 | 当天已有一条用户消息 | 对话服务端到端入口 |
| 2 | 用同一标识重试 | 当天仍只有一条用户消息 | 对话服务端到端入口 |
| 3 | 用新标识发送 | 当天新增一条用户消息 | 对话服务端到端入口 |
