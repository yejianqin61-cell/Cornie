# task-042a 提炼提示词带上页面与观察 ID

## 1. Where this task sits

- **Phase 2 提炼只改它看得见的页面**，目标是和铃湾聊到已有主题时更新那一页，改动主人已确认的页面时变更进入治理队列。
- **本任务推进 R-2 提炼轮能引用它要改动的页面和观察**：模型第一次拿到可引用的 ID，`update_page` 能命中真实页面。这是本阶段的 tracer bullet。
- **Starts after**：Phase 1 已收口。**Waits on**：task-042b 拒绝引用输入之外 ID 的更新。

## 2. What the developer needs to know

**Read first**

- `electron/backend/agent/memoryDistillation.js` 的 `buildDistillationInput` 和 `applyDistilledWikiRequests` — 记忆摘要行和观察是怎么拼进提示词的，`update_page` 怎么落地。
- `electron/backend/agent/promptBuilder.js` 的 `buildMemoryDistillationPrompt` — 观察块和记忆块的现有格式。
- `tests/services/phase3-distillation-input.test.mjs` — 怎么用 `chatFn` 替身截取提示词。
- `electron/backend/memory-wiki/storage.js` 的 `upsertPageIndexEntry` — 轻索引里到底存了哪些字段。

**Settled**

- 提炼输入继续用轻索引（`hydrate: false`），不逐页读文件（`scripts/verify-task466-per-turn-memory-cost.mjs`）。
- 记忆页行的格式固定为 `- [<pageType>] <title> (id: <pageId>)：<summary>`；身份主页行格式固定为 `- [identity] <title> (id: <pageId>)：<summary>`。
- 观察行的格式固定为 `- [<type>] (id: <observationId>) <title>：<content 前 120 字>`。
- 本任务不校验 ID，也不改召回规则；那是 042b、042d 的事。

**Edges and seam**

- Seam：`runMemoryDistillation` 加 `chatFn` 替身（`tests/services/phase3-distillation-input.test.mjs` 已用）。不新增 seam。
- 只改 `memoryDistillation.js` 和 `promptBuilder.js`，以及上面这个测试文件。

**Run**

- `node tests/services/phase3-distillation-input.test.mjs`
- `node scripts/verify-9.0-memory-distillation.mjs && node scripts/verify-task466-per-turn-memory-cost.mjs`
- `npm run lint`

**Unknowns**

- 如果 `promptBuilder.js` 的观察块读不到 `id`（`todayObservations` 的条目没有该字段），停止并报告，不要自己改观察服务。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：让提炼提示词里的每页记忆和每条观察带上 ID，并证明引用该 ID 的更新能生效。
2. 在测试文件里先写 Case 1 和 Case 2 的红测试，断言提示词含 ID。
3. 改 `buildDistillationInput`，让记忆摘要行按 Settled 的格式带 `pageId`。
4. 改 `buildMemoryDistillationPrompt` 的观察块，按 Settled 的格式带 `id`。
5. 写 Case 3 的红测试，用替身输出一条引用该 ID 的 `update_page`，确认页面摘要被更新；确认它已经能通过。
6. 运行第 2 部分的三条命令。
7. 提交：`feat(memory): expose page and observation ids to the distillation turn`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 先 `memoryWiki.create` 建一页，取返回的 `pageId`，再跑一次提炼 | 截取到的提示词包含字面量 `(id: ` + 该 `pageId` + `)` | `runMemoryDistillation` |
| 2 | 先 `addNoteSmart` 建一条今日观察，取返回的 `note.id` | 提示词包含该观察的 `(id: <note.id>)` | `runMemoryDistillation` |
| 3 | 替身输出 `update_page`，`pageId` 取 Case 1 的 ID，`summary` 为 `新摘要` | 结果里该条为 `updated`，`memoryWiki.get(pageId).summary` 等于 `新摘要` | `runMemoryDistillation` |

预期值中的 ID 来自创建时的返回值，摘要来自测试里写死的字面量，不来自阅读提炼代码。
