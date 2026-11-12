# task-044e 巡检按钮与审计视图

## 1. Where this task sits

- **Phase 4 主人能看见并纠正记忆治理**，目标是主人在记忆页能确认一页、合并两页、触发巡检，并在审计视图看到这些操作；治理面板全部是中文。
- **本任务推进 R-9 巡检能从界面触发，审计日志能在界面查看**：治理面板加巡检按钮，记忆页加审计视图。
- **Starts after**：task-044d 审计日志的只读接口。**Waits on**：task-044f 记忆页合并入口。

## 2. What the developer needs to know

**Read first**

- `src/renderer/api/memory-wiki.js` — `inspectionScan()` 已存在但页面没调用；审计函数要新增。
- `src/renderer/components/memory/MemoryWikiHomePage.vue` 的 `openGovernance`、`loadGovernance` 和工具栏 — 新按钮和新视图挂在这里。
- `src/renderer/components/memory/memoryLabels.js` — 044c 建的标签文件，本任务追加审计事件标签。
- `electron/backend/memory-wiki/service.js` 的 `enqueueInspectionGovernanceRequests` — 已按问题指纹去重，返回 `{ createdCount, items }`。

**Settled**

- renderer API 新增 `listAuditEvents({ limit, pageId })`，请求 `GET /api/memory-wiki/audit`；`inspectionScan` 沿用现有。
- 巡检按钮在治理面板头部，文字"巡检"；点击后调用 `inspectionScan()`，完成后重新读取治理列表，并显示一行结果"新增 N 条建议"（N 为 `createdCount`）；进行中禁用按钮，防止重复点击。
- 审计视图是工具栏上的"审计"按钮打开的浮层，列出最近 50 条：时间、事件类型标签、关联页面（`pageId`，空则不显示）、`reason`（空则不显示）。
- 审计事件标签固定：`page_created` 页面创建；`page_updated` 页面更新；`page_topic_linked` 页面挂接主题；`pages_merged` 页面合并；`page_deleted` 页面删除；`page_compressed` 页面压缩；`page_rolled_back` 页面回滚；`memory_distillation` 记忆提炼；`observation_compression_applied` 观察日志压缩已应用。未知类型回退原值。
- 处理函数固定为 `runInspection()`、`openAudit()`，供测试通过 `wrapper.vm` 调用。
- 不做审计的筛选、分页和导出。

**Edges and seam**

- Seam：`MemoryWikiHomePage.test.js`（`vi.mock('../../api/memory-wiki.js')`）和 `api.test.js`。不新增 seam。
- 改 `api/memory-wiki.js`、`memoryLabels.js`、`MemoryWikiHomePage.vue` 和这两个测试文件。

**Run**

- `npx vitest run src/renderer/components/memory src/renderer/api`
- `npm run lint`

**Unknowns**

- 页面测试文件对 `../../api/memory-wiki.js` 是整体 mock，新增的两个函数必须加进它的 `vi.hoisted` 对象，否则别的用例会因为 `undefined` 报错。这不是阻塞，按此处理。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：界面能触发巡检，并能查看最近的审计事件。
2. 先写 Case 1 至 Case 4 的红测试。
3. 在 `api/memory-wiki.js` 新增 `listAuditEvents`，在 `api.test.js` 里断言它的路径与查询串。
4. 在 `memoryLabels.js` 追加审计事件标签。
5. 在页面里加 `runInspection()`、巡检按钮、结果提示、`openAudit()` 和审计浮层。
6. 运行第 2 部分的两条命令。
7. 提交：`feat(memory): trigger inspections and read the audit log from the memory page`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 调用 `runInspection()`，`inspectionScan` 返回 `{ result: { createdCount: 2 } }` | 调用 `inspectionScan` 一次、重新读取治理列表一次；页面显示"新增 2 条建议" | `MemoryWikiHomePage` |
| 2 | `inspectionScan` 尚未返回时再次调用 `runInspection()` | 不会发起第二次请求 | `MemoryWikiHomePage` |
| 3 | `openAudit()`，接口返回 `page_updated` 与 `pages_merged` 两条 | 浮层显示"页面更新"和"页面合并"，不显示英文类型 | `MemoryWikiHomePage` |
| 4 | 审计事件类型为字面量 `brand_new_event` | 显示 `brand_new_event`，不报错 | `MemoryWikiHomePage` |
| 5 | `listAuditEvents({ limit: 5, pageId: 'p1' })` | 请求路径含 `/api/memory-wiki/audit`、`limit=5`、`pageId=p1` | `api.test.js` |

提示语"新增 2 条建议"和事件标签来自 Settled 里的固定文字。
