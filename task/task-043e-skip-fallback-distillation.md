# task-043e 兜底回复与中断回合不提炼

## 1. Where this task sits

- **Phase 3 记忆写入不丢、回复不等**，目标是回复在模型说完后立即完成，提炼在后台写入，两路并发写入不丢任何一页。
- **本任务推进 R-8 提炼不拖慢回复完成**：模型出错时产生的兜底回复不该被当成"铃湾说的话"送去提炼；被客户端中断的回合也不提炼。
- **Starts after**：task-043d 提炼移到回复完成之后。**Waits on**：task-043f 并发与时序的端到端验证。

## 2. What the developer needs to know

**Read first**

- `electron/backend/agent/orchestrator.js` — `finalReply` 初值是 `buildProtocolFallbackReply()`；模型调用抛错时进入 `catch`，仍然保存这句兜底回复并走到提炼。
- 同文件里 `signal?.aborted` 的检查 — 上一轮已让中断的回合在落库回复和提炼之前就抛出，本任务给它补测试。
- `tests/orchestrator/conversation-orchestrator.test.mjs` — 怎么用 `withMockedFetch` 模拟模型。
- `tests/services/phase1-chat-e2e.test.mjs` — 断流重试用例（中断的回合不落兜底回复）。

**Settled**

- "兜底回复"的判定：`runTurn` 的主 `try` 块进入了 `catch`（模型调用或协议解析失败）。此时仍保存兜底回复给用户，但不启动提炼。
- 写意图被纠正的回复（`looksLikeWriteIntent` 那段）不算兜底，照常提炼。
- 被中断的回合继续沿用上一轮的行为：抛 `AbortError`，既不保存回复也不提炼，不改。
- 不新增审计事件；跳过提炼就是不调用它。

**Edges and seam**

- Seam：现有编排器测试加 `withMockedFetch`。不新增 seam。
- 只改 `orchestrator.js` 和 `tests/orchestrator/conversation-orchestrator.test.mjs`；`phase1-chat-e2e` 里的断流用例已存在，只需运行确认。

**Run**

- `node tests/orchestrator/conversation-orchestrator.test.mjs`
- `node tests/services/phase1-chat-e2e.test.mjs && node tests/services/stream-abort.test.mjs`
- `npm run lint`

**Unknowns**

- 如果模型的第一次调用失败后又被重试成功（`requestProtocolEnvelope` 内部的修复重试），那不算进入 `catch`，照常提炼。无法确定某种失败是否进入 `catch` 时，停止并报告，不要自己加分类。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：模型失败产生的兜底回复不送去提炼。
2. 先写 Case 1、Case 2 的红测试。
3. 在 `runTurn` 里加一个 `modelFailed` 标记，在主 `catch` 中置为真。
4. 只在 `modelFailed` 为假时启动提炼。
5. 运行第 2 部分的三条命令，确认 Case 3 也通过。
6. 提交：`fix(conversation): skip memory distillation for fallback replies`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 模型请求一律抛错（模拟断网） | 返回的回复是兜底句；`await whenMemoryDistillationIdle()` 后审计中没有 `memory_distillation` 事件 | `orchestrator.runTurn` |
| 2 | 模型正常回复一句话 | `await whenMemoryDistillationIdle()` 后审计中恰好 1 个 `memory_distillation` 事件 | `orchestrator.runTurn` |
| 3 | 客户端在流式回复中途断开，再用同一 `requestId` 重试 | 重试得到回复，历史里只有 1 条用户消息（`phase1-chat-e2e` 既有用例） | 真实 HTTP |

预期的事件个数（0 与 1）由"是否调用提炼"直接决定，不来自读代码。
