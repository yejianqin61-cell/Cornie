# 483 Phase 2 工作日跨模块演示

## 1. Where this task sits

- **Phase 2 日常业务都能真实落库**：目标是一个工作日的六类业务能保存并重载。
- 本任务为 R-4 收支、R-5 生命周期与 R-6 辅助业务提供跨模块最终证明。
- 开始前需要任务 477–482；完成后 Phase 2 可关闭。

## 2. What the developer needs to know

**Read first**

- `electron/server.js` — 真实服务如何注册所有业务路由。
- `tests/services/phase1-chat-e2e.test.mjs` — 随机端口与隔离存储的端到端模式。
- `electron/backend/ledger/service.js` — 收支创建的真实字段。
- `electron/backend/todo/service.js` 与 `schedule/service.js` — 生命周期动作的真实字段。
- `electron/backend/diary/routes.js` 与 `observation/routes.js` — 日记和观察的 HTTP 入口。

**Settled**

- 测试在一个隔离用户会话、一个本地日期和一个真实 HTTP 服务中完成。
- 业务顺序为类别与支出、待办、日程、观察、日记、设置。
- 每个写入都通过后续读取证明，不模拟路由响应。

**Edges and seam**

- 接缝是 `createServer()` 注册的完整本地 HTTP API。
- 不运行 Electron UI 自动化、不访问外部模型。

**Run**

- `node tests/services/phase2-workday-e2e.test.mjs`
- `npm run test:full`
- `npm run build`。

**Unknowns**

- 若服务启动与 harness 工具注册冲突，沿用 Phase 1 的清理步骤。
- 若某类业务不能重载，停在该真实端点，不用 mock 替代。

## 3. The workflow

1. 阅读第 2 部分，复述：同一工作日的六类写入必须能从真实服务读回。
2. 依次写入类别与支出、待办和日程，产出生命周期结果。
3. 写入观察、日记和设置，产出可读回的辅助业务结果。
4. 重启或重新读取所有端点，产出一致性证明。
5. 运行三个命令并提交端到端验证。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 收支 | 类别和 66 元支出 | 月内可读 | Ledger HTTP |
| 待办 | 新待办后完成 | 可重开 | Todo HTTP |
| 日程 | 新日程后取消 | 可恢复 | Schedule HTTP |
| 观察日记 | 两类正文 | 同日可读 | Diary/Observation HTTP |
| 设置 | 保存后清除 | 旧值不可读 | Settings HTTP |
