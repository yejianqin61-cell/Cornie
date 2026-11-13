# Cornie-044 记忆治理界面收口简报

## 1. Headline

**本期：Phase 4 的后端接口与界面代码全部完成；`npm run test:full` 通过。在界面上走完整个流程这一项没有实机验证。**

基线：`doc/Cornie-040-审计后改进计划.md` 的 Phase 4（R-6、R-9、R-10、R-14、R-15）。

| # | Change | Where | Kind | State | What it means for the reader |
| --- | --- | --- | --- | --- | --- |
| H-1 | 确认路由与详情页"主人已确认"开关 | `memory-wiki/routes.js`、`MemoryWikiDetail.vue` | New | Done | 主人能确认或取消确认一页；切换留下版本快照和 `page_updated` 审计 |
| H-2 | 列表接口 `total` 返回过滤后的真实总数 | `memory-wiki/service.js`、`routes.js` | Fixed | Done | 分页时总数不再等于页大小 |
| H-3 | 治理面板的类型、状态、动作、证据全部中文，原始 JSON 折叠 | `memoryLabels.js`、`MemoryWikiHomePage.vue` | Changed | Done | 主人读得懂每条请求 |
| H-4 | 审计日志只读接口，支持条数上限与按页面过滤 | `memory-wiki/audit.js`、`routes.js` | New | Done | 审计日志第一次对界面开放 |
| H-5 | 治理面板巡检按钮与审计视图 | `MemoryWikiHomePage.vue`、`api/memory-wiki.js` | New | Done | 主人能触发巡检并查看最近 50 条审计事件 |
| H-6 | 详情页合并入口，并修复分组树 | `MemoryWikiHomePage.vue`、`MemoryWikiTree.vue` | New / Fixed | Done | 确认前写明哪一页会被归档；树随筛选更新、分组标题认全 13 种页面类型 |
| H-7 | 真实 HTTP 串联用例 | `tests/services/memory-wiki-routes.test.mjs` | New | Done | 确认、合并、总数、巡检去重、审计合起来成立 |

Routine：8 个提交；新增 `memory-wiki-routes` 后端测试 5 例；前端测试由 177 例增至 197 例。

## 2. What it means

对照验收项：

- R-6：详情页开关切换后，响应与再次读取的 `ownerConfirmed` 一致；切换留下 1 个版本快照和 `page_updated` 审计；非布尔值返回 400。
- R-9：巡检按钮调用既有接口，进行中不会重复发起，完成后重新读取治理列表并显示"新增 N 条建议"；服务端第二次扫描因去重新增 0 条；审计视图显示中文事件类型。
- R-10：合并前确认文案恰为"将「来源」合并进「目标」，「来源」会被归档。"；合并后重新读取列表并保持目标页被选中；失败显示在错误条里。
- R-14：30 页、`limit=10&offset=10` 时 `total` 为 30；4 页归档、`status=archived&limit=2` 时 `total` 为 4。
- R-15：12 种请求类型、5 种状态、6 种动作、6 种修复项都有中文标签，未知值回退原值；原始证据放进默认折叠的 `<details>`。

**界面没有实机走查。** 本仓库的前端测试是组件测试，页面测试还把子组件替换成占位，所以"主人在界面上走完确认、合并、巡检、查看审计"没有被真正运行过。复验步骤：

```bash
npm run load:demo-memory -- --base-dir ./tmp/cornie-demo
```

然后按 `doc/Cornie-031-Phase3-记忆Demo演示脚本.md` 启动应用，在记忆页依次点：确认开关、合并、治理里的巡检、审计。

## 3. Still open

- 审计日志是只追加文件，每次读取要读完整文件；接口只靠 200 条上限保护，没有轮转与清理。
- 审计视图不支持筛选、分页和导出。
- 治理面板的"涉及页面"显示页面 ID，没有解析成标题。
- 合并只能把一页并入当前页，没有撤销入口（可通过版本历史回滚目标页，来源页需手动恢复）。
- 巡检请求的 `payload.kind` 有 6 种修复项标签，但其中只有 3 种有应用动作（见上一轮治理流程）；其余批准后只算人工确认。
