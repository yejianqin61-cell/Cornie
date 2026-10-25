# task-040b 发送请求标识传递

## 1. Where this task sits

- **阶段 1 一次发送只写入一次**，目标是断流或刷新失败后消息可见且不重复落库。
- **本任务推进 R-4 断流重试不重复写入**，让同一发送和它的重试共享一个可验证标识。
- **Starts after**：040a 断流重试端到端红测试。**Waits on it**：存储去重和重试回显。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/ChatPanel.vue` — 发送、失败和重试如何共享临时消息。
- `src/renderer/api/conversation.js` — 渲染进程发送请求的唯一边界。
- `src/renderer/api/client.js` — 流式请求如何序列化请求体。
- `electron/backend/conversation/routes.js` — HTTP 请求被验证并转交服务的位置。

**Settled**

- 新发送生成一个标识；失败重试复用失败消息的标识。
- 标识随请求体传递，路由在服务边界验证它。
- 只处理对话请求，不扩展其它模块协议。

**Edges and seam**

- 触及对话页面、渲染 API 和对话路由。
- Seam：现有 `sendMessageStreamed()` 请求边界和服务路由测试。

**Run**

- `npx vitest run src/renderer/components/chat/ChatPanel.test.js src/renderer/api/api.test.js`
- `node tests/services/phase2-local-date.test.mjs`

**Unknowns**

- 浏览器生成标识的运行时支持须由现有 Electron 版本证明。
- 若路由已有通用 ID 验证，复用它；没有时仅加输入边界所需的最小验证。

## 3. The workflow

1. 阅读第 2 部分文件，并复述“重试复用原发送标识”。
2. 写渲染端失败重试的红测试，断言两次请求带同一标识。
3. 写路由的红测试，断言标识转交给会话服务。
4. 在发送状态、API 和路由中传递并验证该标识。
5. 运行两组测试，确认初次发送和重试的标识口径一致。
6. 提交请求标识传递变更。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 首次发送 | 请求含非空标识 | `sendMessageStreamed()` |
| 2 | 首次失败后重试 | 两次请求标识相同 | `sendMessageStreamed()` |
| 3 | 两次独立发送 | 两个请求标识不同 | `sendMessageStreamed()` |
| 4 | 流式 HTTP 请求 | 服务收到原标识 | 对话服务路由 |
