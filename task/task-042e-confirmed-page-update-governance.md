# task-042e 已确认页面的更新进入待审队列

## 1. Where this task sits

- **Phase 2 提炼只改它看得见的页面**，目标是和铃湾聊到已有主题时更新那一页，改动主人已确认的页面时变更进入治理队列。
- **本任务推进 R-5 主人已确认的页面不被提炼直接覆盖**：提炼想改 `ownerConfirmed` 页面时，改成一条待审请求，批准并应用后才写入。
- **Starts after**：task-042d 提炼输入按对话召回相关页面。**Waits on**：task-042f 端到端验证。

## 2. What the developer needs to know

**Read first**

- `electron/backend/agent/memoryDistillation.js` 的 `applyDistilledWikiRequests` — `update_page` 分支现在直接 `memoryWiki.update`；破坏性分支怎么入队。
- `electron/backend/memory-wiki/service.js` 的 `executeApprovedGovernanceRequest` 和 `isGovernanceRequestApplicable` — `memory_wiki_llm_proposals` 请求怎么应用，以及上一轮建立的"批准后应用，再进入 `applied`"流程。
- `tests/services/phase3-memory-e2e.test.mjs` — 通过真实 HTTP 走批准与应用的写法。

**Settled**

- 请求类型沿用 `requestType: 'memory_wiki_llm_proposal'`、`queueSection: 'memory_wiki_llm_proposals'`、`triggerSource: 'memory_distillation'`，`payload.request` 为原始提议，`payload.request.action` 为 `update_page`。这样现有的可应用判定和 `applied` 终态直接适用，不改 `governanceStore.js`。
- 判定条件只看 `existing.ownerConfirmed === true`；未确认页面的更新行为保持不变。
- 应用 `update_page` 时，标题、摘要、正文、重要性取提议里非空的值，否则保留页面现有值，与提炼里未确认页面的合并规则一致。
- 结果项为 `{ action: 'deferred_to_governance', wikiAction: 'update_page' }`。

**Edges and seam**

- Seam：`runMemoryDistillation` 加 `chatFn` 替身，加上真实 HTTP（`phase3-memory-e2e` 的 `withServer`）。不新增 seam。
- 改 `memoryDistillation.js`、`memory-wiki/service.js`，以及 `phase3-memory-e2e.test.mjs`。

**Run**

- `node tests/services/phase3-memory-e2e.test.mjs`
- `node tests/services/phase3-distillation-input.test.mjs && node scripts/verify-9.0-memory-distillation.mjs`
- `node tests/memory-governance/memory-governance.test.mjs`
- `npm run lint`

**Unknowns**

- 如果应用时页面已被删除或归档，`update` 会抛错。保持抛错并让请求停在 `approved`，不要吞掉错误；如果觉得需要自动处理，停止并报告。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：提炼更新已确认页面时改为生成待审请求，批准并应用后才写入。
2. 先写 Case 1 到 Case 4 的红测试。
3. 在 `applyDistilledWikiRequests` 的 `update_page` 分支里，读到 `existing.ownerConfirmed === true` 时调用 `createGovernanceRequest`，不写页面。
4. 在 `executeApprovedGovernanceRequest` 的 LLM 提议分支里增加 `update_page`，按 Settled 的合并规则更新。
5. 确认应用后请求进入 `applied`，再次应用被拒绝（上一轮的终态行为）。
6. 运行第 2 部分的四条命令。
7. 提交：`feat(memory): route distilled updates of confirmed pages through governance`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 页面 `ownerConfirmed` 为 true，替身输出 `update_page`，摘要为 `新摘要` | 结果为 `deferred_to_governance`；页面摘要仍为建页时写死的 `旧摘要` | `runMemoryDistillation` |
| 2 | 同 Case 1 后读队列 | 恰好 1 条 `memory_wiki_llm_proposal`，`payload.request.summary` 为 `新摘要`，状态 `pending` | `GET /memory-wiki/governance` |
| 3 | 对该请求 `PUT status approved` 后 `POST apply` | 页面摘要变为 `新摘要`；请求状态为 `applied` | 真实 HTTP |
| 4 | 页面 `ownerConfirmed` 为 false，同样的更新 | 结果为 `updated`，页面摘要直接变为 `新摘要`，队列不新增 | `runMemoryDistillation` |
| 5 | 对 Case 3 已应用的请求再次 `POST apply` | HTTP 状态码大于等于 400 | 真实 HTTP |

摘要与状态都是测试里写死的字面量，`applied` 终态来自上一轮治理流程的约定（`doc/Cornie-040-审计后改进计划.md` R-5 验收项）。
