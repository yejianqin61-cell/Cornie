# Cornie-042 提炼闭环收口简报

## 1. Headline

**本期：Phase 2 全部完成；提炼只会更新它看得见的页面，改动已确认页面要先经主人批准。`npm run test:full` 通过。**

基线：`doc/Cornie-040-审计后改进计划.md` 的 Phase 2（R-2 至 R-5）。

| # | Change | Where | Kind | State | What it means for the reader |
| --- | --- | --- | --- | --- | --- |
| F-1 | 提示词里每页记忆和每条观察带 `(id: …)` | `promptBuilder.js`、`memoryDistillation.js` | New | Done | 模型可以引用真实 ID，而不是编造 |
| F-2 | 更新类提议只能命中本轮输入里的 ID | `memoryDistillation.js` | Fixed | Done | 编造的 ID 跳过，原因 `page_id_not_in_input` / `observation_id_not_in_input` 写入审计 |
| F-3 | 破坏性提议入队前校验必填 ID、输入范围、页面存在、回滚版本存在 | `memoryDistillation.js`、`verify-9.0` | Fixed | Done | 治理队列不再收到永远无法应用的请求 |
| F-4 | 提炼输入按用户消息与标题的两字组交集召回，只补全前 6 页摘要 | `memoryDistillation.js` | Changed | Done | 聊到已有主题时命中那一页；摘要不再是"暂无摘要" |
| F-5 | 更新已确认页面改为待审请求，批准并应用后才写入 | `memoryDistillation.js`、`memory-wiki/service.js` | New | Done | 主人确认过的记忆不会被提炼悄悄覆盖 |
| F-6 | 真实 HTTP 端到端用例 | `tests/services/phase3-memory-e2e.test.mjs` | New | Done | 四条需求合起来成立 |

Routine：6 个提交，`phase3-distillation-input` 测试由 3 例增至 10 例，`phase3-memory-e2e` 由 1 例增至 3 例。

## 2. What it means

对照 R-2 至 R-5 的验收项：

- R-2：提示词含页面与观察 ID；引用列出的 ID 的更新生效；引用输入之外的 ID 时跳过并计入审计。
- R-3：目标存在的归档入队；目标不存在、ID 为空、版本不存在、合并自身的提议都不入队。
- R-4：提到已有主题时，该页出现在提炼输入里，页数不超过 6 页加身份主页；坏页不阻塞提炼。
- R-5：已确认页内容不变并生成 1 条待审请求；批准并应用后页面更新、请求进入 `applied`，再次应用被拒绝；未确认页行为不变。

与简报的两处差异，均不影响验收：

1. 召回用 `memoryWiki.list()` 而不是 `listSummaries(..., { hydrate: false })`。原因是后者返回的摘要对象丢失了 `updatedAt`（`summarizePage` 读的是 `lastUpdatedAt`，轻索引条目没有这个字段），而排序需要它；`list()` 返回的轻索引条目本身带 `updatedAt`，仍不读文件。
2. 042c 的 `page_not_found` 用例改用"从未被读取过的坏页"。页面读取有缓存，带外删除文件而不经服务时缓存会继续返回旧页；经服务的删除会同时清缓存并移出索引，所以该原因只在索引与文件不一致时出现。

## 3. Still open

- 两字组打分对单字标题和纯英文标题效果差，没有扩展规则。
- 已确认页面的更新应用后，请求类型在治理面板里仍显示英文枚举，界面标签留给 Phase 4（R-15 治理面板用人话展示类型、状态和证据）。
- 主人在界面上确认或取消确认一页记忆的入口还没有（Phase 4 的 R-6）；目前只有身份流程和观察升级会把页面置为已确认。
- 页面读取缓存对带外删除不敏感，如有外部工具直接删文件，提炼校验可能把已删除页面判为存在。
