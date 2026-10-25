# task-040e 发送重试阶段回归

## 1. Where this task sits

- **阶段 1 一次发送只写入一次**，目标是断流或刷新失败后消息可见且不重复落库。
- **本任务硬化 R-4 断流重试不重复写入和 R-7 刷新失败保留已发送气泡**，收集阶段证明。
- **Starts after**：040c 会话写入按请求去重和 040d 历史刷新失败保留消息。**Waits on it**：阶段总结。

## 2. What the developer needs to know

**Read first**

- `tests/services/phase1-chat-e2e.test.mjs` — 阶段的真实服务证明。
- `tests/services/stream-abort.test.mjs` — 断开信号的服务端约定。
- `src/renderer/components/chat/ChatPanel.integration.test.js` — 真实组件回显证明。
- `scripts/run-tests.mjs` — 全量门禁会如何纳入前端测试。

**Settled**

- 本任务补齐阶段已有测试缝，不创建第二套验证脚本。
- 证明覆盖新发送、断流重试和刷新失败三条路径。
- 运行结果是阶段收口证据，不改变产品行为。

**Edges and seam**

- 触及现有服务端到端测试、组件集成测试和测试编排。
- Seam：041 阶段 1 指定的现有服务与组件测试入口。

**Run**

- `npm.cmd run test:frontend`
- `npm.cmd run test:full`

**Unknowns**

- 全量门禁可能暴露与本阶段无关的遗留警告；记录而不在本任务扩展修复范围。
- 若故障注入不稳定，保留确定的服务替身而不依赖时间等待。

## 3. The workflow

1. 阅读第 2 部分文件，并复述“阶段证明来自现有真实缝”。
2. 复核运行新发送、断流重试和刷新失败三个行为测试。
3. 删除重复或与行为无关的测试断言。
4. 运行前端测试，记录组件路径结果。
5. 运行全量门禁，记录服务端与前端结果。
6. 提交阶段回归测试和必要的编排调整。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 新请求标识 | 新增一条用户消息 | 对话服务端到端入口 |
| 2 | 已保存后用同一标识重试 | 只保留一条用户消息 | 对话服务端到端入口 |
| 3 | 流完成、历史读取失败 | 完整消息继续显示 | `ChatPanel` 集成测试 |
| 4 | 历史恢复读取 | 已发送消息只显示一次 | `ChatPanel` 集成测试 |
