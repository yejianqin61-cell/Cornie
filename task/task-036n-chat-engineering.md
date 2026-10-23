# task-036n 工程规范与测试缝

## 1. Where this task sits

- **批次 C 发布前界面收口**，目标是界面状态可感知、可访问，壳层不撒谎，代码不留死物。
- **本任务移动 P-14 ← D-14 工程规范与测试缺口**：清掉违反 `.agent` 的注释，补一条不打桩的发送集成测试。
- **Starts after**：C-1、C-2。**Waits on it**：批次 C 收口。

## 2. What the developer needs to know

**Read first**

- `src/renderer/api/client.js` — 未清理的逐行中英文注释。
- `src/renderer/components/chat/ChatPanel.test.js` — 用 stub 替换历史与日期组件的方式。
- `.agent` — “No comments in Vue components or JavaScript”与组件复用规则。
- `scripts/run-tests.mjs:89-92` — full 档已运行前端 Vitest，审计报告的“未进门禁”结论已过时。
- `tests/tooling/phase4-full-gate.test.mjs` — 门禁契约的现有断言。

**Settled**

- 不新增依赖；集成测试继续用 Vitest 与现有 mock。
- 已有 `test:frontend` 进入 full 门禁，不重复接线。
- 注释清理不改变行为，单独提交。

**Edges and seam**

- 触及 `client.js`、`ChatPanel.test.js`，必要时新增 chat 集成测试文件。
- 缝：`ChatPanel` 与真实 `ChatHistoryPage` 的组件接口；不改源码行为。

**Run**

- `npx vitest run src/renderer/components/chat src/renderer/api`
- `npx eslint src/renderer/api src/renderer/components/chat`

**Unknowns**

- 不打桩时 `ChatHistoryPage` 会请求确认列表；若测试泄漏真实 fetch，先 mock 对应 API 模块再继续。

## 3. The workflow

1. 读五个入口，复述任务。
2. 先写红测试：用真实历史组件发送一条流式回复后，页面出现两行消息。
3. 调整 mock 让测试转绿并保持不访问网络。
4. 先写红测试：`client.js` 不含行注释。
5. 清理注释，测试转绿。
6. 跑测试与 eslint，分两次提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 真实 ChatPanel + 流式 done | 页面出现用户与助手两行 | `ChatPanel` |
| 2 | 同上 | 回复文字可见 | `ChatPanel` |
| 3 | 读取 `client.js` | 不含 `//` 行注释 | 文件内容 |
| 4 | full 门禁脚本 | 仍包含 `test:frontend` | `run-tests.mjs` |
