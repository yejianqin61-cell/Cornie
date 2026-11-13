# task-043d 提炼移到回复完成之后

## 1. Where this task sits

- **Phase 3 记忆写入不丢、回复不等**，目标是回复在模型说完后立即完成，提炼在后台写入，两路并发写入不丢任何一页。
- **本任务推进 R-8 提炼不拖慢回复完成**：`runTurn` 在保存回复后立即返回（流式路由随即发出 `done`），记忆提炼在后台执行。
- **Starts after**：task-043c 组合操作在跨实例并发下不死锁。**Waits on**：task-043e 兜底回复与中断回合不提炼。

## 2. What the developer needs to know

**Read first**

- `electron/backend/agent/orchestrator.js` — 现在的顺序是：先 `runMemoryDistillation`，再 `saveMessage` 保存回复，再返回；`R-01` 注释说明当初为什么这么排（让 `done` 时回复已落库）。
- `electron/backend/conversation/routes.js` 的流式路由 — `done` 在 `sendMessageStreamed` 返回之后才发出。
- `tests/shared/orchestrator-harness.mjs` 和 `tests/shared/service-harness.mjs` — `withMockedFetch` 与 `close()`。
- `scripts/verify-task406-legacy-memory-primary-chain-retirement.mjs` — 它在 `runTurn` 之后立刻读记忆页，依赖"提炼已完成"。

**Settled**

- 新顺序：保存回复，再启动提炼，不等待，`runTurn` 返回。"`done` 时回复已落库"这一性质必须保持（旧决策 R-01，来源：orchestrator 注释）。
- `runTurn` 返回值中删除 `memoryDistillation` 字段（已核实 `src` 和路由层没有任何消费者）。
- 等待钩子是模块级导出 `whenMemoryDistillationIdle()`，位于 `orchestrator.js`：内部用一个 `Set` 记录进行中的提炼 Promise；提炼自己吞掉所有错误，所以该函数永不 reject。
- `createServiceHarness(...).close()` 在关闭数据库之前先 `await whenMemoryDistillationIdle()`；`withMockedFetch` 在恢复 `fetch` 之前先 `await whenMemoryDistillationIdle()`，否则后台提炼会去调用真实网络。
- 提炼失败只写审计，不影响已返回的回复（`runMemoryDistillation` 已有此行为）。

**Edges and seam**

- Seam：现有编排器测试（`tests/orchestrator/conversation-orchestrator.test.mjs`）加 `withMockedFetch`；用被模拟的 `fetch` 在提炼请求上设置一个可控的闸门，不新增 seam。提炼请求的识别方式：系统提示里含 `记忆提炼官`。
- 改 `orchestrator.js`、两个共享测试工具，以及手动替换 `global.fetch` 的脚本 `verify-task406`、`verify-task452`、`verify-task453`、`verify-task454`、`verify-task053`（在恢复 `fetch` 或关闭环境之前加 `await whenMemoryDistillationIdle()`）。

**Run**

- `node tests/orchestrator/conversation-orchestrator.test.mjs`
- `node tests/services/stream-abort.test.mjs && node tests/services/phase1-chat-e2e.test.mjs`
- `node scripts/verify-task406-legacy-memory-primary-chain-retirement.mjs && node scripts/verify-task452-drill-budget-and-page-cache.mjs && node scripts/verify-task453-associative-interstitial.mjs && node scripts/verify-task454-streaming-speech.mjs && node scripts/verify-task053-orchestrator-confirm-services.mjs`
- `npm run lint`

**Unknowns**

- 如果任何脚本在改完之后仍然在 `runTurn` 后立刻读记忆并失败，且原因不是"忘了等待"，停止并报告，不要把提炼改回同步。
- 应用退出时仍有提炼在进行：本任务不处理，留在收口简报的遗留项里。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：保存回复后立即返回，把提炼放到后台，并给测试一个等待钩子。
2. 先写 Case 1 至 Case 3 的红测试。
3. 在 `orchestrator.js` 里加进行中提炼的集合和 `whenMemoryDistillationIdle()`。
4. 调整 `runTurn`：保存回复之后再启动提炼（不 `await`），删除返回值里的 `memoryDistillation`。
5. 改两个共享测试工具，让 `close()` 和 `withMockedFetch` 先等待提炼结束。
6. 逐个修复第 2 部分列出的脚本。
7. 运行第 2 部分的全部命令。
8. 提交：`feat(conversation): run memory distillation after the reply is saved`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 提炼请求被闸门挡住；`runTurn` 竞速 2 秒超时 | `runTurn` 在超时前返回，且 `getMessagesByDate` 已含本轮用户与 Cornie 消息 | `orchestrator.runTurn` |
| 2 | 放开闸门并 `await whenMemoryDistillationIdle()`，提炼回复一条观察 `create` | 当天出现该观察 | `whenMemoryDistillationIdle` |
| 3 | 提炼请求直接抛错 | `runTurn` 正常返回回复；审计里有 `source: unavailable` 的提炼事件 | `createMemoryWikiAuditStore().list` |
| 4 | 原有的 7 个编排器用例 | 全部保持通过 | `orchestrator.runTurn` |

Case 1 的 2 秒来自"提炼被挡住时回复仍应秒回"的验收（`doc/Cornie-040-审计后改进计划.md` R-8），观察标题与内容为测试里写死的字面量。
