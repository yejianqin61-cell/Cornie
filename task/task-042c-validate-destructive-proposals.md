# task-042c 破坏性提议入队前校验目标

## 1. Where this task sits

- **Phase 2 提炼只改它看得见的页面**，目标是和铃湾聊到已有主题时更新那一页，改动主人已确认的页面时变更进入治理队列。
- **本任务推进 R-3 破坏性提议入队前校验目标存在**：治理队列里不再出现指向不存在页面的提议。
- **Starts after**：task-042b 拒绝引用输入之外 ID 的更新。**Waits on**：task-042d 提炼输入按对话召回相关页面。

## 2. What the developer needs to know

**Read first**

- `electron/backend/agent/memoryDistillation.js` 的 `applyDistilledWikiRequests` — 破坏性分支现在不校验任何 ID 就入队。
- `electron/backend/memory-wiki/versionStore.js` 的 `listPageVersions` — 版本记录的 `versionId` 字段。
- `scripts/verify-9.0-memory-distillation.mjs` 的用例 6 — 它用字面量 `t`、`s` 当页面 ID 做合并提议，并断言入队。

**Settled**

- 本任务校验顺序固定：先查必填 ID，再查是否在 `allowedPageIds` 里（042b 已建立），再查页面是否仍存在，回滚再查版本。
- 必填：`archive_page`、`delete_page` 需要 `pageId`；`rollback_page` 需要 `pageId` 和 `versionId`；`merge_pages` 需要 `targetPageId`、`sourcePageId` 且两者不同。
- 跳过原因固定：`missing_required_id`、`page_id_not_in_input`、`page_not_found`、`version_not_found`。跳过不入队，沿用 `{ action: 'skipped', reason }`。
- 因此 `verify-9.0` 的用例 6 描述的是旧的错误行为，本任务要把它改成断言跳过，并新增一个用真实页面 ID 的入队用例（来源：`doc/Cornie-040-审计后改进计划.md` R-3 验收项）。

**Edges and seam**

- Seam：`runMemoryDistillation` 加 `chatFn` 替身。不新增 seam。
- 改 `memoryDistillation.js`、`verify-9.0` 脚本、`phase3-distillation-input.test.mjs`。

**Run**

- `node tests/services/phase3-distillation-input.test.mjs`
- `node scripts/verify-9.0-memory-distillation.mjs`
- `node tests/services/phase3-memory-e2e.test.mjs`
- `npm run lint`

**Unknowns**

- 页面存在性用 `memoryWiki.get` 判断，它走缓存。如果出现"刚被删除的页面仍判为存在"，停止并报告，不要绕过缓存。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：破坏性提议入队前先校验必填 ID、输入范围、页面存在和版本存在。
2. 先写 Case 1 到 Case 6 的红测试。
3. 在 `applyDistilledWikiRequests` 的破坏性分支前加一个校验函数，返回跳过原因或 `null`。
4. 校验通过才调用 `createGovernanceRequest`。
5. 改 `verify-9.0` 用例 6：字面量 ID 现在应为 `skipped`；再补一个真实页面入队的用例。
6. 运行第 2 部分的四条命令。
7. 提交：`fix(memory): validate destructive proposals before queueing them`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 真实页面（在输入里），替身输出 `archive_page` | 结果为 `deferred_to_governance`，队列新增 1 条，`pageIds` 含该页 | `runMemoryDistillation` |
| 2 | `archive_page` 的 `pageId` 为空字符串 | `skipped`，`missing_required_id`，队列不变 | `runMemoryDistillation` |
| 3 | `delete_page` 的 `pageId` 为字面量 `ghost-page` | `skipped`，`page_id_not_in_input`，队列不变 | `runMemoryDistillation` |
| 4 | 真实页面，`rollback_page` 的 `versionId` 为字面量 `ver_missing` | `skipped`，`version_not_found`，队列不变 | `runMemoryDistillation` |
| 5 | 两个真实页面，`merge_pages` 目标与来源相同 | `skipped`，`missing_required_id` | `runMemoryDistillation` |
| 6 | 页面在输入里，但提议前文件已被删除 | `skipped`，`page_not_found` | `runMemoryDistillation` |

队列条数从 `listGovernanceRequests` 读取，页面和版本 ID 取创建与 `listVersions` 的返回值，其余为字面量。
