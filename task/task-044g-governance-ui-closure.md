# task-044g 治理界面的端到端验证与收口

## 1. Where this task sits

- **Phase 4 主人能看见并纠正记忆治理**，目标是主人在记忆页能确认一页、合并两页、触发巡检，并在审计视图看到这些操作；治理面板全部是中文。
- **本任务推进 R-6、R-9、R-10、R-14、R-15**：用一条真实 HTTP 链路证明后端接口合起来成立，再写收口简报，并如实写明界面没有实机走查的部分。
- **Starts after**：task-044a 至 044f 全部完成。**Waits on**：Phase 5 后端已有的能力都能在界面用上。

## 2. What the developer needs to know

**Read first**

- `tests/services/memory-wiki-routes.test.mjs` — 044a、044b、044d 已在这里建立的路由测试，本任务追加一条串联用例。
- `doc/Cornie-040-审计后改进计划.md` §3 Phase 4 与 R-6、R-9、R-10、R-14、R-15 的验收项。
- `doc/Cornie-043-记忆写入与回复时序收口简报.md` — 收口简报的写法。

**Settled**

- 串联用例走真实 HTTP：确认一页 → 合并两页 → 触发巡检 → 读取审计，不新增 seam。
- 界面本身没有自动化的实机走查（本仓库的前端测试是组件测试）。收口简报必须写明：Phase 4 的"在界面上走完确认、合并、巡检、查看审计"一项**未经实机验证**，并给出复验步骤——用 `npm run load:demo-memory -- --base-dir .\tmp\cornie-demo` 装载演示数据，再按 `doc/Cornie-031-Phase3-记忆Demo演示脚本.md` 运行应用。
- 新收口简报为 `doc/Cornie-044-记忆治理界面收口简报.md`，结构沿用 043。
- 本任务不改业务代码；失败时按 Unknowns 处理。

**Edges and seam**

- Seam：真实 HTTP（`tests/services/memory-wiki-routes.test.mjs` 的 `withServer`）。
- 只改测试文件，并新增收口简报。

**Run**

- `node tests/services/memory-wiki-routes.test.mjs`
- `npm run test:full`
- `npm run lint`

**Unknowns**

- 串联用例在 044a 至 044f 的任一环失败时，停止并报告失败的是哪一环，不要在本任务里改业务代码。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：用真实 HTTP 证明确认、合并、巡检、审计、总数合起来成立，并诚实记录未实机验证的部分。
2. 写串联用例，按第 4 部分的 Case 1 至 Case 3 断言。
3. 运行 `node tests/services/memory-wiki-routes.test.mjs`，确认通过。
4. 运行 `npm run test:full`，确认通过。
5. 写 `doc/Cornie-044-记忆治理界面收口简报.md`，逐条列出 R-6、R-9、R-10、R-14、R-15 的验收项与结果，并写遗留项。
6. 提交测试：`test(memory): cover confirm, merge, inspection and audit end to end`。
7. 提交简报：`docs(memory): close the memory governance ui phase`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 建页 A、B；把 A 设为已确认；把 B 并入 A | A 的 `ownerConfirmed` 为 `true`；B 为 `archived`；`GET .../pages?status=archived` 的 `total` 为 1 | 真实 HTTP |
| 2 | 用 `PUT /memory-wiki/pages/<A>` 传 `{ relatedPageIds: ['ghost-page'] }`（更新接口不校验关联页面是否存在），再 `POST .../governance/inspection-scan` 两次 | 第一次 `createdCount` 大于 0，第二次为 0（去重） | 真实 HTTP |
| 3 | `GET /memory-wiki/audit?pageId=<A>` | 含 `page_created`、`page_updated`（确认与合并各留一条更新），不含其他页面的事件 | 真实 HTTP |

页数、归档数 1 是测试里写死的操作结果；"第二次为 0"来自巡检按问题指纹去重的既有约定（`doc/Cornie-040-审计后改进计划.md` R-9 验收项）。
