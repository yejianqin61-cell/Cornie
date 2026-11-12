# task-042d 提炼输入按当前对话召回相关页面

## 1. Where this task sits

- **Phase 2 提炼只改它看得见的页面**，目标是和铃湾聊到已有主题时更新那一页，改动主人已确认的页面时变更进入治理队列。
- **本任务推进 R-4 提炼输入按当前对话召回相关页面**：提炼输入里的页面不再是"标题排序的前 6 页"，而是和这一轮对话相关的页面。
- **Starts after**：task-042c 破坏性提议入队前校验目标。**Waits on**：task-042e 已确认页面的更新进入待审队列。

## 2. What the developer needs to know

**Read first**

- `electron/backend/agent/memoryDistillation.js` 的 `buildDistillationInput` 和 `DISTILLATION_MEMORY_PAGE_LIMIT` — 现在怎么选页。
- `electron/backend/memory-wiki/storage.js` 的 `upsertPageIndexEntry` — 轻索引只有 `pageId`、`pageType`、`title`、`slug`、`status`、`importance`、`updatedAt`，没有 `summary`，所以现在非主页的摘要行都显示"暂无摘要"。
- `scripts/verify-task466-per-turn-memory-cost.mjs` — 为什么提炼输入必须用轻索引。

**Settled**

- 计划（`doc/Cornie-040-审计后改进计划.md` R-4）已按核实结果改写：不复用 `buildWikiContext`（它会逐页读文件，违反 466 的轻索引约束），改在轻索引上打分。
- 打分规则固定：把用户消息与页面标题各自拆成相邻两字组，取交集个数作为命中分；同分按 `importance`（critical > high > medium > low）再按 `updatedAt` 新的在前。
- 只对分数最高的 `DISTILLATION_MEMORY_PAGE_LIMIT`（现为 6）页调用 `memoryWiki.get` 补全摘要；身份主页仍无条件列入，不占这 6 个名额。
- 允许集合（042b）按最终列出的页面计算。

**Edges and seam**

- Seam：`runMemoryDistillation` 加 `chatFn` 替身。不新增 seam。
- 只改 `memoryDistillation.js` 和 `phase3-distillation-input.test.mjs`。

**Run**

- `node tests/services/phase3-distillation-input.test.mjs`
- `node scripts/verify-task466-per-turn-memory-cost.mjs && node scripts/verify-9.0-memory-distillation.mjs`
- `node tests/services/phase3-memory-e2e.test.mjs`
- `npm run lint`

**Unknowns**

- 两字组打分对单字标题和纯英文标题效果差。遇到这类页面无法命中时，不要扩展规则，在 PR 描述里记录，留给后续。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：按用户消息与标题的两字组交集挑选相关页面，只补全入选页的摘要。
2. 先写 Case 1 到 Case 4 的红测试。
3. 在 `buildDistillationInput` 里实现打分与排序，替换"标题前 6 页"。
4. 只对入选页调用 `memoryWiki.get`；单页读取失败时保留轻索引条目，不抛错。
5. 确认身份主页仍然列入，允许集合随之更新。
6. 运行第 2 部分的四条命令。
7. 提交：`feat(memory): recall relevant pages for the distillation turn`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 建 8 个页面，其中标题为 `咖啡偏好` 的页面排在标题排序的末尾；用户消息为 `最近又开始喝咖啡了` | 提示词包含 `咖啡偏好` 的 ID，且列出的页面数不超过 6 个加身份主页 | `runMemoryDistillation` |
| 2 | 同上 | 提示词里 `咖啡偏好` 一行带真实摘要，不是 `暂无摘要` | `runMemoryDistillation` |
| 3 | 用户消息与所有标题无共同两字组 | 仍按重要性与更新时间取 6 页，不报错 | `runMemoryDistillation` |
| 4 | 建 5 个页面后删掉其中一页的文件（沿用 task466 的做法） | 提炼正常完成，坏页不阻塞 | `runMemoryDistillation` |

页面标题、摘要、消息都是测试里写死的字面量；页面数上限取自 `doc/Cornie-040-审计后改进计划.md` R-4 的预算约束。
