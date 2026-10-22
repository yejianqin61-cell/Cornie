# 471 Phase 1 真实聊天确认契约测试

## 1. Where this task sits

- **Phase 1 一条真实聊天链能走完**：目标是发送、流式显示、历史重载和确认动作都可完成。
- 本任务落实 **R-1 建立唯一的前后端契约与真实契约测试**，先让错误的聊天和确认接线失败。
- 开始前无需前置任务；完成后，R-2 聊天流和 R-3 确认闭环才能安全改动。

## 2. What the developer needs to know

**Read first**

- `tests/shared/service-harness.mjs` — 如何创建隔离存储并在结束时清理。
- `electron/server.js` — 如何得到真实 Express 应用与本地服务边界。
- `src/renderer/api/client.js` — 前端 API 调用的唯一 HTTP 入口是什么。
- `src/renderer/api/chatlog.js` — 历史列表和单日读取现在请求什么。
- `src/renderer/api/confirm.js` — 确认决定现在传递的路径与字段是什么。

**Settled**

- 契约以服务端已注册的 `/api/chatlogs` 与 `/api/confirmations` 为准。
- 测试必须经过 HTTP 和前端 API 适配层，不能只测 mock 返回值。
- 本任务只建立失败证明，不借机重写聊天页面。

**Edges and seam**

- 接缝是本地 Express 服务与 `src/renderer/api/*` 的 HTTP 边界。
- 触及测试运行器与 API 基址可测试性；不改业务存储或页面表现。

**Run**

- `node tests/services/phase1-chat-contract.test.mjs`
- `npx vitest run src/renderer/api/api.test.js --maxWorkers=1`
- `npm run build`（仓库未提供独立 typecheck 脚本）。

**Unknowns**

- 若真实 `createServer()` 无法隔离模型或记忆启动，应收窄为同一路由的真实 HTTP 服务并说明原因。
- 若 API 基址不能在测试中替换，先补最小覆盖点；不得复制 API 客户端。

## 3. The workflow

1. 阅读第 2 部分，复述：让真实后端契约暴露当前前端聊天与确认错配。
2. 建立临时存储和随机端口，产出可重复运行的 HTTP 测试壳。
3. 为聊天日期列表和单日消息写失败用例，产出明确的路径与字段差异。
4. 为确认决定写失败用例，产出明确的决定词和重复提交期望。
5. 让前端 API 适配器经过该服务，产出可复现的失败结果。
6. 运行三个命令并提交测试意图；实现修复留给后续任务。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 日期列表 | 已存一天对话 | 返回 `entries` | HTTP + `listChatDays()` |
| 单日消息 | `2026-10-22` | 消息有 `content` | HTTP + `getChatDay()` |
| 消息角色 | `cornie` 消息 | 客户端认作助手 | 适配边界 |
| 确认同意 | 待确认 ID | 发送 `approve` | HTTP + `confirmAction()` |
| 重复决定 | 已处理 ID | 不能再次执行 | 确认路由 |
