# task-042f 提炼闭环端到端验证与收口

## 1. Where this task sits

- **Phase 2 提炼只改它看得见的页面**，目标是和铃湾聊到已有主题时更新那一页，改动主人已确认的页面时变更进入治理队列。
- **本任务推进 R-2、R-3、R-4、R-5**：用一条真实 HTTP 链路证明四条需求合起来成立，并写收口简报。
- **Starts after**：task-042a 至 042e 全部完成。**Waits on**：Phase 3 记忆写入不丢、回复不等。

## 2. What the developer needs to know

**Read first**

- `tests/services/phase3-memory-e2e.test.mjs` — 现有的端到端写法，本任务在它旁边加一个新用例。
- `doc/Cornie-040-审计后改进计划.md` §2.2 的 R-2 至 R-5 和 §3 Phase 2 — 每条需求的验收项。
- `doc/Cornie-041-门禁换行治理收口简报.md` — 收口简报的现有写法，新简报沿用。

**Settled**

- 端到端用例放在 `tests/services/phase3-memory-e2e.test.mjs` 里，不新建测试文件，不新增 seam。
- 新收口简报为 `doc/Cornie-042-提炼闭环收口简报.md`，结构沿用 041：Headline、What it means、Still open。
- 本任务不改业务代码；如果端到端失败，按下面的 Unknowns 处理。

**Edges and seam**

- Seam：真实 HTTP（`withServer`）加 `runMemoryDistillation` 替身，与现有 e2e 相同。
- 只改测试文件，并新增收口简报。

**Run**

- `node tests/services/phase3-memory-e2e.test.mjs`
- `npm run test:full`
- `npm run lint`

**Unknowns**

- 端到端在 042a 至 042e 的任一环失败时，停止并报告失败的是哪一环，不要在本任务里改业务代码。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：把四条需求串成一条真实 HTTP 链路来证明。
2. 写端到端用例，按第 4 部分的 Case 1 至 Case 3 依次断言。
3. 运行 `node tests/services/phase3-memory-e2e.test.mjs`，确认通过。
4. 运行 `npm run test:full`，确认仍然通过。
5. 写 `doc/Cornie-042-提炼闭环收口简报.md`，逐条列出 R-2 至 R-5 的验收项与结果。
6. 提交测试：`test(memory): cover the distillation loop end to end`。
7. 提交简报：`docs(memory): close the distillation loop phase`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 建未确认的 `咖啡偏好` 页，用户消息提到咖啡，替身对列出的 ID 输出 `update_page` | 页面摘要更新，没有新建重复页（页面总数不变） | 真实 HTTP |
| 2 | 建已确认页，替身对它输出 `update_page`；再让替身对字面量 `ghost-page` 输出 `archive_page` | 已确认页内容不变，队列出现 1 条待审请求；`ghost-page` 的提议没有入队 | 真实 HTTP |
| 3 | 批准并应用 Case 2 的请求，再应用一次 | 页面更新，请求为 `applied`；第二次应用状态码大于等于 400 | 真实 HTTP |

页面总数、摘要和队列条数都从 HTTP 响应里读取，预期值为测试里写死的字面量。
