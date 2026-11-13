# task-045g 逐页对照路由清单并收口

## 1. Where this task sits

- **Phase 5 后端已有的能力都能在界面用上**，目标是主人能在界面上管理三域类目、编辑日程、搜索聊天，看到联想话语和关联记忆，不再需要通过对话绕路。
- **本任务推进 R-11、R-12、R-13、R-16**：把后端全部 HTTP 接口与前端实际调用逐条对照，找出没有界面入口的接口，并写收口简报。
- **Starts after**：task-045a 至 045f 全部完成。**Waits on**：Phase 6 不打开主窗口也照顾得到主人。

## 2. What the developer needs to know

**Read first**

- `electron/backend/*/routes.js` 与 `electron/server.js` — 全部后端接口的来源。
- `src/renderer/api/*.js` — 前端请求函数；再用 `grep` 看哪些函数被组件真正引用。
- `doc/Cornie-040-审计后改进计划.md` §2.3 与 §3 Phase 5 — 验收项与"Not here"。
- `doc/Cornie-044-记忆治理界面收口简报.md` — 收口简报的写法。

**Settled**

- 清单是文档，不是代码：写在收口简报里，一张表，三列——接口、前端入口、结论（已有入口 / 有意不做并写明原因）。
- 本阶段已知"有意不做"的接口：`GET /telemetry`（运维用）、`GET /model/status`（设置页已用，不在本表）、`/conversations/:date` 的 `GET` 与 `DELETE`（聊天页用的是 chatlog 接口；删除某日会话是破坏性操作，未设计界面）、`/chatlogs/export/month/:month`（按月导出）。除这些外，如果发现还有没入口的接口，只写进表和"Still open"，**不要**在本任务里新增界面。
- 如果这些已知项里有某条其实已经有入口，以实际 `grep` 结果为准并更正表。
- 新收口简报为 `doc/Cornie-045-后端能力接入界面收口简报.md`，结构沿用 044（Headline、What it means、Still open）。
- 本任务不改业务代码；失败时按 Unknowns 处理。

**Edges and seam**

- Seam：现有的 `npm run test:full`。不新增 seam。
- 只新增收口简报。

**Run**

- `grep -rhoE "'/[a-zA-Z0-9:/_-]+'" electron/backend/*/routes.js electron/server.js | sort -u`
- `grep -rhoE "/api/[a-zA-Z0-9/_:${}.-]+" src/renderer/api/*.js | sort -u`
- `grep -rn "from '.*api/" src/renderer/components --include=*.vue`
- `npm run test:full`

**Unknowns**

- 路由路径里的参数写法（`:id` 与 `${id}`）不同，对照时按"去掉参数后的前缀与方法"人工匹配，不要写脚本做自动对账。
- `test:full` 在 045a 至 045f 的任一环失败时，停止并报告失败的是哪一环，不要在本任务里改业务代码。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：逐条对照后端接口与前端入口，把没有入口的接口及原因记进收口简报。
2. 运行第 2 部分的前三条命令，得到接口清单与前端引用。
3. 按 Settled 的格式列出对照表，覆盖每一条接口。
4. 运行 `npm run test:full`，确认通过。
5. 写 `doc/Cornie-045-后端能力接入界面收口简报.md`：Headline 列出 R-11、R-12、R-13、R-16 的结果，What it means 逐条对照验收项，并写明"界面没有实机走查"（与 044 相同的原因），Still open 列出表里"有意不做"的接口。
6. 提交：`docs(ui): close the backend capabilities in the ui phase`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 对照表 | 后端每个 `routes.js` 里的接口都有一行，没有遗漏的 `routes.js` 文件 | 收口简报 |
| 2 | 已知"有意不做"的接口 | 每条都有一句原因，没有"待定" | 收口简报 |
| 3 | `npm run test:full` | 退出码 0，末行 `[tests:full] passed` | `scripts/run-tests.mjs` |
| 4 | R-11、R-12、R-13、R-16 的验收项 | 每项写明结果；没有实机验证的项明确标注 | 收口简报 |

末行文字来自 `scripts/run-tests.mjs` 的输出约定；其余是文档完整性检查，没有可计算的预期值。
