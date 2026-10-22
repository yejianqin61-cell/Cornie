# 476 Phase 1 可控模型聊天确认端到端验证

## 1. Where this task sits

- **Phase 1 一条真实聊天链能走完**：目标是发送、流式显示、历史重载和确认动作都可完成。
- 本任务为 R-1、R-2、R-3 与 R-8 提供最终证明，用可控模型替身跑完整链。
- 开始前需要任务 471–475 完成；完成后，Phase 1 可以关闭。

## 2. What the developer needs to know

**Read first**

- `tests/orchestrator/conversation-orchestrator.test.mjs` — 现有可控 `chatFn` 如何驱动编排结果。
- `electron/backend/agent/orchestrator.js` — 模型调用点与可注入边界在哪里。
- `electron/backend/conversation/service.js` — 服务如何创建编排器并暴露流式调用。
- `electron/server.js` — 测试如何把模型替身传入真实 HTTP 应用。
- `tests/services/phase1-chat-contract.test.mjs` — Phase 1 已固定的 HTTP 契约。

**Settled**

- 生产默认仍使用现有 DeepSeek 客户端；仅测试注入确定的模型替身。
- 替身必须覆盖普通回复与需要确认的工具调用两条路径。
- 端到端测试通过随机端口、隔离存储和真实路由，不调用外部模型。

**Edges and seam**

- 接缝是 `createConversationOrchestrator()` 的模型依赖到 `createServer()` 的测试注入路径。
- 不改模型协议、不访问真实 API Key、不引入测试依赖。

**Run**

- `node tests/services/phase1-chat-e2e.test.mjs`
- `node tests/orchestrator/conversation-orchestrator.test.mjs`
- `npm run test:full`

**Unknowns**

- 若当前编排器没有注入点，添加一个可选参数并保持默认值不变。
- 若确认执行需要真实业务工具，选用现有轻量工具或服务替身；不得模拟路由返回。

## 3. The workflow

1. 阅读第 2 部分，复述：不调用外部模型地证明真实聊天、历史与确认全链。
2. 让替身先产出普通回复，为 SSE delta 和 done 写失败测试。
3. 通过真实历史接口重载当天消息，产出持久化证明。
4. 让替身产出确认型工具调用，产出 pending confirmation。
5. 提交一次批准并验证工具只执行一次，产出确认闭环证明。
6. 运行三个命令并提交端到端验证意图。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 普通聊天 | 替身回复 | SSE 有 delta 与 done | `/conversations/stream` |
| 历史重载 | 同一日期 | 有用户和 Cornie 消息 | `/chatlogs/:date` |
| 确认生成 | 替身工具调用 | 返回 pending confirmation | 编排器 + HTTP |
| 批准执行 | pending ID | 工具执行且确认已批准 | `/confirmations/:id/decision` |
| 再次批准 | 同一 ID | 不会二次执行 | 确认服务 |
