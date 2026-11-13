# task-044d 审计日志的只读接口

## 1. Where this task sits

- **Phase 4 主人能看见并纠正记忆治理**，目标是主人在记忆页能确认一页、合并两页、触发巡检，并在审计视图看到这些操作；治理面板全部是中文。
- **本任务推进 R-9 巡检能从界面触发，审计日志能在界面查看**：先让后端对界面开放审计日志（现在只对模型工具开放）。
- **Starts after**：task-044c 治理面板的中文标签与证据摘要。**Waits on**：task-044e 巡检按钮与审计视图。

## 2. What the developer needs to know

**Read first**

- `electron/backend/memory-wiki/audit.js` — 审计存储 `list({ limit })`：读整个 JSONL，取最后 N 条并倒序；没有按页面过滤。
- `electron/backend/memory-wiki/service.js` 的 `listAuditEvents` 和 `tools.js` 的 `memory_wiki.list_audit_events` — 现有的内部入口。
- `electron/backend/memory-wiki/routes.js` — 路由写法与 `requireString` 校验。
- `tests/services/memory-wiki-routes.test.mjs` — 044a 新建的路由测试文件，本任务在里面追加。

**Settled**

- 路由固定为 `GET /memory-wiki/audit?limit=<n>&pageId=<id>`，响应 `{ items }`；每条事件的字段沿用存储里的 `eventId`、`eventType`、`pageId`、`relatedPageId`、`versionId`、`reason`、`details`、`createdAt`。
- `limit` 缺省 50，上限 200（超过按 200，存储层本来就限制到 500）；非数字按缺省。
- `pageId` 过滤放在存储层 `list({ limit, pageId })`，先过滤再取最后 N 条；`pageId` 同时匹配 `pageId` 和 `relatedPageId`（合并事件的来源页也能查到）。
- 不新增写接口；审计日志仍是只追加。
- 日志长期会变大：本任务只靠上限保护，不做轮转（留在收口简报的遗留项）。

**Edges and seam**

- Seam：真实 HTTP，写进 `tests/services/memory-wiki-routes.test.mjs`。
- 改 `audit.js`、`service.js`（只传 `pageId` 透传即可）、`routes.js` 和该测试文件。

**Run**

- `node tests/services/memory-wiki-routes.test.mjs`
- `node scripts/verify-task094-memory-wiki-audit.mjs`
- `npm run lint`

**Unknowns**

- 如果现有的 `verify-task094` 对 `list` 的返回顺序或条数有假设而变红，停止并报告，不要改它。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：给审计日志加一个只读接口，支持条数上限和按页面过滤。
2. 先写 Case 1 至 Case 4 的红测试。
3. 在审计存储的 `list` 里加 `pageId` 过滤。
4. 在路由里加 `GET /memory-wiki/audit`，处理 `limit` 的缺省与上限。
5. 运行第 2 部分的三条命令。
6. 提交：`feat(memory): expose the audit log through a read-only route`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 建 3 页、更新其中 1 页，`GET /memory-wiki/audit` | `items` 里含 `page_created` 3 条和 `page_updated` 1 条，按时间倒序 | 真实 HTTP |
| 2 | 同上，`?pageId=<被更新的页>` | 只含该页的 `page_created` 与 `page_updated`，共 2 条 | 真实 HTTP |
| 3 | 建 60 页后 `GET /memory-wiki/audit`；再 `?limit=5` | 前者 50 条，后者 5 条 | 真实 HTTP |
| 4 | 合并页 A 与页 B（B 为来源），`?pageId=<B>` | 能查到 `pages_merged` 事件 | 真实 HTTP |
| 5 | `?limit=abc` | 状态码 200，按缺省 50 条 | 真实 HTTP |

条数 3、1、2、50、5 都来自测试里写死的操作次数和接口约定。
