# BE-04 SSE 断连中止与心跳（Stream Disconnect Abort）

## 背景

流式对话端点无断连处理（Cornie-022 §3.3.1 B7）：

- `conversation/routes.js:22-46` `/conversations/stream`：设置 SSE 头后直接 `await conversation.sendMessageStreamed(...)`，**无 `req.on('close')`、无 AbortController 下传**。
- 客户端断开后 DeepSeek 流仍跑完（或等到超时），`res.write` 打在已关闭 socket 上无保护；无心跳保活。

## 目标

1. SSE 端点监听 `req close` → AbortController → 下传至流式客户端，中止模型调用与读取循环。
2. `res.write` 容错（连接已关闭时静默）。
3. 周期性发送注释心跳行保活（可选，防代理超时）。

## 范围

- `electron/backend/conversation/routes.js`（流式端点）
- `electron/backend/conversation/service.js`（`sendMessageStreamed` 支持 signal 透传）
- `electron/backend/model/deepseek/client.js`（`chatStream` 支持外部 signal 中止——与 BE-09 的 fetch 统一协同，本任务先保证 signal 生效）
- `tests/orchestrator/conversation-orchestrator.test.mjs`（新增断连中止用例）或新增 `tests/services/stream-abort.test.mjs`

## 设计要求

### 1. 断连中止链路

- 路由层：`const controller = new AbortController()`；`req.on('close', () => controller.abort())`（注意：请求正常结束后 close 也会触发——用 `res.writableEnded` 或完成标记区分，避免正常完成时误中止）。
- signal 沿 `sendMessageStreamed → chatStream` 透传；中止后读取循环立即退出，不再写 SSE。
- 中止后的 `res.write` 失败（EPIPE/已关闭）静默吞掉（不产生未处理异常）。

### 2. 心跳

- 每 N 秒（如 15s）发送 `: keep-alive\n\n` 注释行（不触发前端事件解析的副作用）；连接关闭时停止心跳定时器。

### 3. 兼容性

- 正常完成路径（`kind:'done'`）与错误路径（`kind:'error'`）行为不变；现有流式测试不回归。

## 验收标准

1. 新增测试通过：模拟客户端断开（触发 req close）→ 断言 abort 信号被调用、底层流停止、无未处理异常。
2. 正常完成路径测试不回归（done 事件正常下发）。
3. `npm run test:full` 全绿。
4. 提交为 `fix(backend): ...` 单提交，符合 commit 规范。

## 依赖

- 模型层 signal 透传若涉及 `client.js` 重构，与 BE-09 有交集：本任务先加最小 signal 支持，BE-09 做 fetch 统一时保留该契约。
