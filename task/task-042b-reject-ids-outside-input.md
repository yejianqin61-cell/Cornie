# task-042b 拒绝引用输入之外 ID 的更新

## 1. Where this task sits

- **Phase 2 提炼只改它看得见的页面**，目标是和铃湾聊到已有主题时更新那一页，改动主人已确认的页面时变更进入治理队列。
- **本任务推进 R-2 提炼轮能引用它要改动的页面和观察**：模型编造 ID 时，更新不得生效，并且留下可查的跳过原因。
- **Starts after**：task-042a 提炼提示词带上页面与观察 ID。**Waits on**：task-042c 破坏性提议入队前校验目标。

## 2. What the developer needs to know

**Read first**

- `electron/backend/agent/memoryDistillation.js` 的 `buildDistillationInput`、`executeDistillationEnvelope`、`applyDistilledObservations`、`applyDistilledWikiRequests` — 输入怎么构建，提议怎么执行，跳过怎么记录。
- `runMemoryDistillation` 末尾的审计写入 — `details.results` 和 `skipped` 计数已经包含跳过项。
- `tests/services/phase3-distillation-input.test.mjs` — 替身与断言写法。

**Settled**

- 允许集合 = 本轮提示词里实际列出的页面 ID 和观察 ID（含身份主页）。`buildDistillationInput` 额外返回 `allowedPageIds`、`allowedObservationIds`，由 `runMemoryDistillation` 传给执行函数。
- 跳过不新增审计事件：沿用结果数组里的 `{ action: 'skipped', reason }`，它们已随 `memory_distillation` 审计事件写入 `details.results`。
- 跳过原因固定：`update_page` 用 `page_id_not_in_input`；观察 `update` 用 `observation_id_not_in_input`。
- 本任务不处理破坏性提议，那是 042c 的事。

**Edges and seam**

- Seam：`runMemoryDistillation` 加 `chatFn` 替身。不新增 seam。
- 只改 `memoryDistillation.js` 和 `phase3-distillation-input.test.mjs`。

**Run**

- `node tests/services/phase3-distillation-input.test.mjs`
- `node scripts/verify-9.0-memory-distillation.mjs && node scripts/verify-task466-per-turn-memory-cost.mjs`
- `node tests/services/phase3-memory-e2e.test.mjs`
- `npm run lint`

**Unknowns**

- 如果 `verify-9.0` 或 e2e 因为本任务的改动变红，且原因不是下表的预期差异，停止并报告，不要放宽允许集合。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：只允许更新本轮输入里出现过的页面和观察，其余跳过并留原因。
2. 先写 Case 1 到 Case 4 的红测试。
3. 让 `buildDistillationInput` 返回两个允许集合，并在 `runMemoryDistillation` 里传下去。
4. 在 `applyDistilledWikiRequests` 的 `update_page` 分支里，ID 不在 `allowedPageIds` 时跳过。
5. 在 `applyDistilledObservations` 的 `update` 分支里，ID 不在 `allowedObservationIds` 时跳过。
6. 运行第 2 部分的四条命令。
7. 提交：`fix(memory): reject distilled updates that cite ids outside the input`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 页面已建并出现在输入里；替身对它的 ID 输出 `update_page` | 结果为 `updated`，摘要变为测试写死的字面量 | `runMemoryDistillation` |
| 2 | 替身输出 `update_page`，`pageId` 为字面量 `ghost-page` | 结果为 `skipped`，`reason` 为 `page_id_not_in_input`；没有创建任何页面 | `runMemoryDistillation` |
| 3 | 替身输出观察 `update`，`observationId` 为字面量 `ghost-obs` | 结果为 `skipped`，`reason` 为 `observation_id_not_in_input` | `runMemoryDistillation` |
| 4 | 跑 Case 2 后读审计 | `memory_distillation` 事件的 `details.skipped.wikiRequests` 为 1 | `createMemoryWikiAuditStore().list` |

预期值都是测试里写死的字面量，没有一个是读代码得来的。
