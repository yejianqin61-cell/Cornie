# BE-05 telemetry 可观测化（Telemetry Observability）

## 背景

埋点结构齐全但无消费方，失败路径零记录（Cornie-022 §3.3.2 N1 + B6）：

- `agent/metrics.js:95-116` `recordModelCallTelemetry` **无 error/失败字段**。
- orchestrator（:74-80）与 executor（:43-49）只在 chat() 成功返回后记录；chat() 抛错（超时/断网/缺 key）时**零记录**，顶层 catch 仅 console.error。
- telemetry 仅随 API 响应返回，**不落盘**；`category/audit.js:31` 审计也仅 console.log。

## 目标

1. telemetry 增加失败分类：`outcome.status ∈ { ok, timeout, protocol_failed, network_error, aborted }` 与 `errorCode`。
2. 模型调用失败在 catch 路径也记录（不再零记录）。
3. 终态 telemetry 与审计事件**落盘**（本地 JSONL，按日期分片），提供只读查询入口。

## 范围

- `electron/backend/agent/metrics.js`（status/errorCode 字段 + 失败记录函数）
- `electron/backend/agent/orchestrator.js`（catch 路径埋点 + 落盘调用）
- `electron/backend/confirm/executor.js`（同）
- `electron/backend/category/audit.js`（审计落盘）
- 新建 telemetry 持久化模块（如 `electron/backend/agent/telemetryStore.js`：按日期写 JSONL、列表查询）
- `electron/server.js`（如需暴露只读查询路由 `/api/telemetry`，只读权限）
- 测试：`tests/orchestrator/conversation-orchestrator.test.mjs`（失败分类）+ 新增 `tests/services/telemetry-store.test.mjs`

## 设计要求

### 1. 失败分类

- `finalizeTurnTelemetry` 的 outcome 增加 `status` 与 `errorCode`；chat 抛错时按错误类型映射（Abort/超时 → timeout；TypeError/网络 → network_error；协议解析失败 → protocol_failed；外部取消 → aborted）。
- 失败路径调用 `recordModelCallTelemetry`（attempt/error 信息），使 `model.callCount` 与 `calls[]` 包含失败轮。

### 2. 落盘

- telemetry 终态 JSON 行追加到 `userData/telemetry/YYYY-MM-DD.jsonl`（一行一条）；审计事件同样落盘（同目录或既有 audit 通道扩展）。
- 写盘失败不阻断主流程（try/catch 吞并 + 一次 console 警告）。
- 提供只读查询：`listTelemetry({ date })` 返回当日记录（供前端后续使用，本批不要求 UI）。

### 3. 兼容性

- 现有 telemetry 消费方（响应内嵌 telemetry 的接口）字段兼容：新增字段不影响旧字段读取；测试断言旧字段不回归。

## 验收标准

1. 新增测试通过：模型超时/断网/协议失败 → telemetry `outcome.status` 正确分类、`calls[]` 含失败记录；落盘 JSONL 存在对应行；查询接口返回记录。
2. 既有 orchestrator/confirm 测试不回归；`npm run test:full` 全绿。
3. 提交为 `feat(backend): ...` 或 `fix(backend): ...` 单提交，符合 commit 规范。

## 依赖

- 无（独立；落盘目录复用 userData baseDir 约定）。
