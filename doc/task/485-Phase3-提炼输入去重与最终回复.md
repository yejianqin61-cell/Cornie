# 485 Phase 3 提炼输入去重与最终回复

## 1. Where this task sits

- **Phase 3 记忆能力成为 Demo 的主角**：目标是提炼结果可信且可解释。
- 本任务修正 Phase 3 的提炼输入，避免重复用户消息并保留最终 Cornie 回复。
- **开始前**：任务 484 定义链路契约。**等待它**：任务 487 的治理证据展示。

## 2. What the developer needs to know

**Read first**

- `electron/backend/agent/memoryDistillation.js` — 输入组装与模型调用。
- `electron/backend/agent/orchestrator.js` — 何时提供用户和最终回复。
- `tests/orchestrator/conversation-orchestrator.test.mjs` — 对话替身与断言模式。
- `electron/backend/agent/promptLoadingPolicy.js` — 提炼轮次的输入预算。

**Settled**

- 一条用户消息在提炼输入中只出现一次。
- 成功的最终 Cornie 回复进入提炼语境。
- 输入长度仍受既有预算限制。

**Edges and seam**

- 接缝是 `buildDistillationInput()` 与调用者传参。
- 不改变提炼协议或模型供应商。

**Run**

- `node tests/services/phase3-distillation-input.test.mjs`
- `npm run test:full`

**Unknowns**

- 若流式回复不可用，只记录已完成的最终文本，不拼接增量。

## 3. The workflow

1. 阅读第 2 部分，复述：提炼上下文包含完整一轮且没有重复消息。
2. 写重复用户消息的失败测试。
3. 写最终回复缺失的失败测试。
4. 在单一输入组装处最小修复。
5. 运行命令并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 用户消息 | 历史含当前消息 | 只出现一次 | `buildDistillationInput()` |
| 最终回复 | Cornie 成功回复 | 出现在提炼语境 | 同上 |
| 空回复 | 空 Cornie 文本 | 不添加空消息 | 同上 |
| 旧历史 | 超过预算历史 | 保留既有截断 | 同上 |
| 提炼失败 | 模型异常 | 不写入记忆 | `runMemoryDistillation()` |
