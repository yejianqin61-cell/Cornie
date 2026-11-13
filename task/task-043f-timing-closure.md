# task-043f 并发与时序的端到端验证与收口

## 1. Where this task sits

- **Phase 3 记忆写入不丢、回复不等**，目标是回复在模型说完后立即完成，提炼在后台写入，两路并发写入不丢任何一页。
- **本任务推进 R-7、R-8，并加固 R-5 主人已确认的页面不被提炼直接覆盖**：用一条真实 HTTP 链路证明"`done` 之后立即刷新能看到回复"和"后台提炼与界面写入并发不丢页"，再写收口简报。
- **Starts after**：task-043a 至 043e 全部完成。**Waits on**：Phase 4 主人能看见并纠正记忆治理。

## 2. What the developer needs to know

**Read first**

- `tests/services/phase1-chat-e2e.test.mjs` — 真实 HTTP 下走 `/conversations/stream` 的写法，以及 `withServer`。
- `tests/services/phase3-memory-e2e.test.mjs` — 真实 HTTP 下走记忆页面接口的写法。
- `doc/Cornie-040-审计后改进计划.md` §2.2 的 R-7、R-8 和 §3 Phase 3 — 验收项。
- `doc/Cornie-042-提炼闭环收口简报.md` — 收口简报的写法。

**Settled**

- 端到端用例放进 `tests/services/phase3-memory-e2e.test.mjs`，不新建测试文件，不新增 seam。
- 提炼请求用被模拟的 `fetch` 加闸门挡住，识别方式同 043d：系统提示含 `记忆提炼官`。
- 新收口简报为 `doc/Cornie-043-记忆写入与回复时序收口简报.md`，结构沿用 042。
- 本任务不改业务代码；失败时按 Unknowns 处理。

**Edges and seam**

- Seam：真实 HTTP（`createServer` 加 `app.listen`）加 `fetch` 模拟，与现有 e2e 相同。
- 只改测试文件，并新增收口简报。

**Run**

- `node tests/services/phase3-memory-e2e.test.mjs`
- `npm run test:full`
- `npm run lint`

**Unknowns**

- 端到端在 043a 至 043e 的任一环失败时，停止并报告失败的是哪一环，不要在本任务里改业务代码。
- 本任务用到的闸门写法如果让测试偶发超时，停止并报告，不要用更长的 `setTimeout` 掩盖。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：用真实 HTTP 证明 `done` 不等提炼、并发写入不丢页。
2. 写 Case 1：流式请求在提炼被挡住时收到 `done`，随即读历史。
3. 写 Case 2：提炼被挡住期间，从 HTTP 并发创建 5 页；放开闸门，让提炼也创建 1 页。
4. 运行 `node tests/services/phase3-memory-e2e.test.mjs`，确认通过。
5. 运行 `npm run test:full`，确认通过。
6. 写 `doc/Cornie-043-记忆写入与回复时序收口简报.md`，逐条列出 R-7、R-8 的验收项与结果，并写明遗留项（应用退出时仍有提炼在进行）。
7. 提交测试：`test(memory): cover reply timing and concurrent memory writes`。
8. 提交简报：`docs(memory): close the memory write and reply timing phase`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 提炼被闸门挡住时发起流式发送 | 在闸门放开之前收到 `done` 事件，且 `GET /chatlogs/<date>` 已含本轮用户与 Cornie 消息 | 真实 HTTP |
| 2 | 闸门挡住期间并发 `POST /memory-wiki/pages` 5 次；放开闸门，提炼输出 1 条 `create_page` | `await whenMemoryDistillationIdle()` 后，`GET /memory-wiki/pages` 恰好返回 6 页 | 真实 HTTP |
| 3 | 提炼的 `create_page` 与上述 5 次创建使用不同标题 | 6 页的标题各不相同，无一被覆盖 | 真实 HTTP |

页数 6 由"5 次 HTTP 创建加 1 次提炼创建"直接得出，标题是测试里写死的字面量。
