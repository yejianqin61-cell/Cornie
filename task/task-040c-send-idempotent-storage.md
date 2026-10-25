# task-040c 会话写入按请求去重

## 1. Where this task sits

- **阶段 1 一次发送只写入一次**，目标是断流或刷新失败后消息可见且不重复落库。
- **本任务推进 R-4 断流重试不重复写入**，让存储层持久识别同一发送。
- **Starts after**：040a 红测试和 040b 请求标识传递。**Waits on it**：刷新失败后的界面去重。

## 2. What the developer needs to know

**Read first**

- `electron/db.js` — 会话表迁移、写入和按日读取的现有约束。
- `electron/backend/agent/orchestrator.js` — 用户消息先写入、再组装上下文的顺序。
- `electron/backend/conversation/service.js` — 路由与编排器之间的参数边界。
- `tests/shared/orchestrator-harness.mjs` — 编排器临时数据库测试如何建立。

**Settled**

- 请求标识必须在本地数据库中持久保存，并由唯一约束保护。
- 同一请求的用户消息只创建一次；中断后可从已有消息继续本轮。
- 老记录不带标识仍可读取；不迁移或改写已有会话正文。

**Edges and seam**

- 触及会话迁移、写入接口、编排器和服务。
- Seam：现有对话服务端到端入口，复用 040a 的重试场景。

**Run**

- `node tests/services/phase1-chat-e2e.test.mjs`
- `node tests/orchestrator/conversation-orchestrator.test.mjs`

**Unknowns**

- 并发的同一标识可能同时抵达；若唯一约束不能给出确定结果，停止并报告。
- 已有用户消息但没有助手回复时，重试必须重启回复，不能伪造完成结果。

## 3. The workflow

1. 阅读第 2 部分文件，并复述“存储是去重的最终边界”。
2. 为同一标识的二次调用写红测试，断言只存一条用户消息。
3. 为迁移后的旧会话读取写红测试，断言原消息仍完整可读。
4. 添加最小迁移和查询，让写入返回已有或新建的用户消息。
5. 让编排器在重试时从已有消息继续回复，而非再次保存它。
6. 运行端到端和编排器测试，确认两个场景均通过。
7. 提交持久去重变更。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 同一标识连续发送两次 | 仅一条用户消息 | 对话服务端到端入口 |
| 2 | 写入后中断再用同一标识发送 | 仅一条用户消息且得到回复 | 对话服务端到端入口 |
| 3 | 不同标识、相同正文 | 两条用户消息 | 对话服务端到端入口 |
| 4 | 旧数据库记录 | 历史正文仍可读取 | 会话存储读取 |
