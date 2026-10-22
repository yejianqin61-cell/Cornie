# 484 Phase 3 记忆全链真实契约

## 1. Where this task sits

- **Phase 3 记忆能力成为 Demo 的主角**：目标是长期信息可写入、召回、追溯和治理。
- 本任务落实 Phase 3 的真实链路证明，固定“记住—想起—追溯—纠正”最小契约。
- **开始前**：Phase 2 完成。**等待它**：任务 485 至 490 的行为接线。

## 2. What the developer needs to know

**Read first**

- `electron/server.js` — 完整 HTTP API 的注册方式。
- `electron/backend/agent/memoryDistillation.js` — 提炼写入和治理入队入口。
- `electron/backend/memory-wiki/routes.js` — 页面、追溯和治理的真实端点。
- `tests/services/phase2-workday-e2e.test.mjs` — 隔离存储的端到端测试模式。

**Settled**

- 测试使用可控模型替身，不访问外部模型。
- 提炼破坏性提议必须进入治理队列。
- 证明只能经 `createServer()` 的真实 HTTP 路径完成。

**Edges and seam**

- 接缝是 `runMemoryDistillation()` 到 Memory Wiki HTTP API。
- 不做浏览器自动化或安装包验证。

**Run**

- `node tests/services/phase3-memory-e2e.test.mjs`
- `npm run test:full`

**Unknowns**

- 若服务启动触发工具注册冲突，沿用 Phase 1 的 `clearTools()` 清理。

## 3. The workflow

1. 阅读第 2 部分，复述：一条信息必须可提炼、读取、追溯和治理。
2. 写页面创建、来源追溯和治理入队的失败测试。
3. 以可控模型执行提炼并通过真实 HTTP 读取结果。
4. 加入批准后的应用结果断言。
5. 运行命令并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 提炼写入 | 长期偏好消息 | 创建记忆页 | `runMemoryDistillation()` |
| 来源追溯 | 创建页 ID | 返回消息来源 | `source-trace` |
| 召回 | 记忆摘要 | 上下文包含摘要 | `buildWikiContext()` |
| 高风险提议 | archive 提议 | 进入治理队列 | governance API |
| 批准应用 | pending 请求 | 页面状态改变 | `apply` API |
