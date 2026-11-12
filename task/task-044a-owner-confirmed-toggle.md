# task-044a 记忆详情页的确认开关

## 1. Where this task sits

- **Phase 4 主人能看见并纠正记忆治理**，目标是主人在记忆页能确认一页、合并两页、触发巡检，并在审计视图看到这些操作；治理面板全部是中文。
- **本任务推进 R-6 主人能在界面上确认或取消确认一页记忆**：后端补路由，详情页加开关。这是本阶段的 tracer bullet。
- **Starts after**：Phase 3 已收口。**Waits on**：task-044b 列表返回真实总数。

## 2. What the developer needs to know

**Read first**

- `electron/backend/memory-wiki/routes.js` — 现有的 `PUT .../importance`、`PUT .../status` 路由写法，新路由照同样的形状加。
- `electron/backend/memory-wiki/service.js` 的 `setOwnerConfirmed` — 已存在，经 `update` 走版本快照和 `page_updated` 审计，路由只需调用它。
- `src/renderer/api/memory-wiki.js` — 现有的 `updatePageImportance` 等函数写法。
- `src/renderer/components/memory/MemoryWikiDetail.vue` 与 `MemoryWikiHomePage.vue` 的 `updateSelectedImportance` — 详情页事件怎么冒泡到页面处理函数。

**Settled**

- 路由固定为 `PUT /memory-wiki/pages/:pageId/owner-confirmed`，请求体 `{ ownerConfirmed: true|false }`，响应 `{ page }`；`ownerConfirmed` 必须是布尔值，否则 400。
- renderer API 函数固定为 `setPageOwnerConfirmed(pageId, ownerConfirmed)`。
- 详情页用原生复选框，`data-testid="memory-owner-confirmed"`，标签文字"主人已确认"；事件名固定为 `ownerConfirmed`，载荷为布尔值。（现有测试对原生控件好用，对 `Button` 组件不好用。）
- 页面处理函数固定为 `updateSelectedOwnerConfirmed(value)`，沿用 `runPageAction` 的刷新逻辑。
- 确认后受 `doc/Cornie-042-提炼闭环收口简报.md` 的"已确认页面不被提炼直接覆盖"保护，不需要额外处理。

**Edges and seam**

- Seam：真实 HTTP（新测试文件 `tests/services/memory-wiki-routes.test.mjs`，写法同 `phase3-memory-e2e.test.mjs` 的 `withServer`）；前端用 `memory.test.js` 与 `MemoryWikiHomePage.test.js`。
- 改 `routes.js`、`api/memory-wiki.js`、`MemoryWikiDetail.vue`、`MemoryWikiHomePage.vue`，新增上面的路由测试文件。

**Run**

- `node tests/services/memory-wiki-routes.test.mjs`
- `npx vitest run src/renderer/components/memory src/renderer/api`
- `npm run lint`

**Unknowns**

- 如果 `setOwnerConfirmed` 在某类页面上被 `normalizeStructuredPageInput` 改写（身份类页面会重新生成摘要和正文），导致开关切换后内容变化，停止并报告，不要绕过 `update`。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：补一条设置确认状态的路由，详情页加开关，刷新后保持。
2. 先写 Case 1 至 Case 3 的后端红测试（新测试文件）。
3. 在 `routes.js` 加路由，调用 `memoryWiki.setOwnerConfirmed`。
4. 在 `api/memory-wiki.js` 加 `setPageOwnerConfirmed`，并在 `api.test.js` 里断言它请求的路径与方法。
5. 先写 Case 4、Case 5 的前端红测试，再改详情页和页面处理函数。
6. 运行第 2 部分的三条命令。
7. 提交：`feat(memory): let the owner confirm or unconfirm a memory page`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 建一页（默认未确认），`PUT .../owner-confirmed` 传 `true`，再 `GET` 该页 | 响应与再次读取的 `ownerConfirmed` 都为 `true` | 真实 HTTP |
| 2 | 同一页再传 `false` | `ownerConfirmed` 变回 `false` | 真实 HTTP |
| 3 | 请求体 `{ ownerConfirmed: "yes" }` | 状态码 400 | 真实 HTTP |
| 4 | 对已确认的页面，读 `GET .../versions` 与审计 | 版本数比切换前多 1；最新审计事件为 `page_updated` | 真实 HTTP |
| 5 | 详情页传入 `page.ownerConfirmed = true`，点击复选框取消 | 触发 `ownerConfirmed` 事件，载荷为 `false` | `MemoryWikiDetail` |
| 6 | 页面处理函数 `updateSelectedOwnerConfirmed(true)` | 调用 `setPageOwnerConfirmed(pageId, true)` 一次，随后重新读取该页 | `MemoryWikiHomePage` |

预期值是测试里写死的布尔值、状态码和"版本数加 1"，不来自读代码。
