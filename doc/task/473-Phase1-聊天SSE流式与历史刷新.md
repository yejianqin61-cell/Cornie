# 473 Phase 1 聊天 SSE 流式与历史刷新

## 1. Where this task sits

- **Phase 1 一条真实聊天链能走完**：目标是发送、流式显示、历史重载和确认动作都可完成。
- 本任务落实 **R-2 打通聊天发送、流式回复与历史浏览**，让聊天页使用已有 SSE。
- 开始前需要任务 472 的消息边界；完成后，R-3 确认卡可接收流结束返回的待确认项。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/chat/ChatPanel.vue` — 当前发送、草稿和结果如何落入页面状态。
- `src/renderer/api/conversation.js` — 已有 SSE API 如何交付 delta、done 和 error。
- `src/renderer/api/client.js` — SSE 解析、取消和非成功 HTTP 响应如何处理。
- `electron/backend/conversation/routes.js` — delta、done、error 的事件格式与断连语义。
- `tests/services/stream-abort.test.mjs` — 服务端取消已被证明的边界。

**Settled**

- 发送使用 `/api/conversations/stream`，不是旧的非流式 POST。
- 页面先展示用户消息，再以临时助手消息累积 delta。
- done 后以服务端结果刷新当天历史；中止和失败都保留可重试草稿。
- 日期仍由现有页面提供；本任务不改变时区策略。

**Edges and seam**

- 接缝是 `ChatPanel.vue` 对 `sendMessageStreamed()` 的调用。
- 不改变 SSE 协议、模型编排和后端持久化顺序。

**Run**

- `npx vitest run src/renderer/components/chat/chat.test.js src/renderer/api/api.test.js --maxWorkers=1`
- `node tests/services/stream-abort.test.mjs`
- `npm run build`（仓库未提供独立 typecheck 脚本）。

**Unknowns**

- 若 `apiStream()` 无法中止，先添加最小 AbortController 透传；不得新增第二套流客户端。
- 若 done 返回与历史读取短暂不同步，以上游持久化顺序为准并记录实际缺口。

## 3. The workflow

1. 阅读第 2 部分，复述：把当前聊天发送换成已有 SSE 并保持可恢复状态。
2. 为首个 delta 写失败组件测试，产出临时助手消息。
3. 接入流 API 并逐段追加正文，产出完成前可见回复。
4. 为 done、中止和 error 分别写失败测试，产出确定的发送状态。
5. 在 done 后刷新当日历史，产出重载后与页面一致的消息列表。
6. 运行三个命令并提交流式聊天意图。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 首段 | `delta: 你` | 出现临时助手行 | `ChatPanel` |
| 多段 | `你`、`好` | 正文为 `你好` | `onDelta` |
| 完成 | `done` 结果 | 刷新当天历史 | `onDone` |
| 中止 | 点击取消 | 请求被取消且草稿保留 | `AbortController` |
| 失败重试 | `error` 事件 | 显示失败并可再次发送 | `onError` |
