# task-044b 记忆列表返回真实总数

## 1. Where this task sits

- **Phase 4 主人能看见并纠正记忆治理**，目标是主人在记忆页能确认一页、合并两页、触发巡检，并在审计视图看到这些操作；治理面板全部是中文。
- **本任务推进 R-14 记忆列表返回真实总数**：列表接口现在把"当前页条数"当成 `total`，分页时是错的。
- **Starts after**：task-044a 记忆详情页的确认开关。**Waits on**：无，只被收口任务核对。

## 2. What the developer needs to know

**Read first**

- `electron/backend/memory-wiki/routes.js` 的 `GET /memory-wiki/pages` — `total: items.length` 在分页之后计算。
- `electron/backend/memory-wiki/service.js` 的 `list` — 先按 `pageType`、`status` 过滤，再按 `offset`、`limit` 切片，返回数组。
- `scripts/verify-task463-list-pagination.mjs` — 现有分页验证，它直接用 `memoryWiki.list`，必须保持通过。

**Settled**

- 不改 `list` 的返回类型（它被很多地方当数组用）。新增 `count({ pageType, status })`，过滤规则与 `list` 一致，不切片。
- 路由的 `total` 取 `count` 的结果；`items`、`limit`、`offset` 保持原样。
- 前端当前没有读取 `total`（已核实），所以本任务不改前端。

**Edges and seam**

- Seam：真实 HTTP，写进 `tests/services/memory-wiki-routes.test.mjs`（044a 新建）。不新增 seam。
- 只改 `service.js`、`routes.js` 和这个测试文件。

**Run**

- `node tests/services/memory-wiki-routes.test.mjs`
- `node scripts/verify-task463-list-pagination.mjs`
- `npm run lint`

**Unknowns**

- 无已知风险。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：分页前先计数，让 `total` 表示过滤后的总条数。
2. 先写 Case 1、Case 2 的红测试。
3. 在服务里加 `count`，复用 `list` 的过滤逻辑（把过滤抽成内部函数，两处共用）。
4. 改路由的 `total`。
5. 运行第 2 部分的三条命令。
6. 提交：`fix(memory): report the real total in the page list`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 建 30 页，`GET /memory-wiki/pages?limit=10&offset=10` | `items` 长度为 10，`total` 为 30 | 真实 HTTP |
| 2 | 其中 4 页归档，`GET .../pages?status=archived&limit=2` | `items` 长度为 2，`total` 为 4 | 真实 HTTP |
| 3 | 不带分页参数 | `total` 等于 `items` 长度 | 真实 HTTP |

页数 30、归档数 4 是测试里写死的建页数量。
