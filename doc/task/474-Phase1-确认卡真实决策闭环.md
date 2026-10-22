# 474 Phase 1 确认卡真实决策闭环

## 1. Where this task sits

- **Phase 1 一条真实聊天链能走完**：目标是发送、流式显示、历史重载和确认动作都可完成。
- 本任务落实 **R-3 打通高风险操作的确认闭环**，让确认卡提交真实决定且不重复执行。
- 开始前需要任务 473 的流结束结果；完成后，Phase 1 的用户确认路径可验收。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/ConfirmCard.vue` — 卡片事件、禁用状态和错误展示在哪里。
- `src/renderer/api/confirm.js` — 前端确认调用当前使用的旧路径和词汇。
- `electron/backend/confirm/routes.js` — 服务端接受 `approve` 与 `reject` 的唯一入口。
- `electron/backend/confirm/service.js` — 已处理确认的状态转换与执行职责。
- `src/renderer/components/chat/chat.test.js` — 现有确认卡可扩展的组件测试边界。

**Settled**

- 前端调用 `/api/confirmations/:id/decision`，请求体为 `{ decision: 'approve'|'reject' }`。
- 点击后立即锁定两枚按钮，直到结果或错误落定。
- 成功后使用服务端确认状态更新卡片；失败时解锁并显示错误。
- 重复决定由后端保护，前端只做防双击体验保护。

**Edges and seam**

- 接缝是 `ConfirmCard.vue` 的决定事件到 `confirmAction()`。
- 不重写确认服务、工具执行器或风险策略。

**Run**

- `npx vitest run src/renderer/components/chat/chat.test.js src/renderer/api/api.test.js --maxWorkers=1`
- `node tests/services/phase1-chat-contract.test.mjs`
- `npm run build`（仓库未提供独立 typecheck 脚本）。

**Unknowns**

- 若重复审批现在仍会重新执行，必须在服务层找到并修复根因，不能只依赖按钮禁用。
- 若卡片没有收到确认对象，先证明 SSE done 的字段来源，再改绑定。

## 3. The workflow

1. 阅读第 2 部分，复述：一张确认卡只能提交一次真实的同意或拒绝。
2. 为同意与拒绝写失败组件和 API 测试，产出正确路径和决定词。
3. 将卡片事件接到真实 API，产出待处理状态与按钮锁定。
4. 用服务端结果更新卡片，产出批准、拒绝和失败三种终态。
5. 为快速双击和已处理 ID 写失败测试，产出单次执行证明。
6. 运行三个命令并提交确认闭环意图。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 同意 | 点击确认 | `decision: approve` | `confirmAction()` |
| 拒绝 | 点击拒绝 | `decision: reject` | `confirmAction()` |
| 处理中 | 第一次点击后 | 两个按钮禁用 | `ConfirmCard` |
| 服务端成功 | 已批准结果 | 卡片显示终态 | `ConfirmCard` |
| 重复决定 | 同一 ID 两次 | 工具只执行一次 | 确认服务 |
