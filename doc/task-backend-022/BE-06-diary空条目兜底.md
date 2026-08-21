# BE-06 diary 空条目兜底（Empty Diary Entry Guard）

## 背景

日记生成对空条目抛 TypeError → 500（Cornie-022 §3.3.2 N2）：

- `diary/service.js:16` 与 `diary/generator.js:88,98` 直接读 `getEntry(store, date).userText`；当天无日记条目时 `getEntry` 返回 null → 读 `.userText` 抛 TypeError → asyncHandler → 500，前端无友好错误。

## 目标

1. 空条目访问有兜底：不再抛 TypeError。
2. 无条目时返回友好错误语义（4xx 或带文案的错误），前端可读。

## 范围

- `electron/backend/diary/service.js`（生成/重生成入口兜底）
- `electron/backend/diary/generator.js`（空 entry 的默认文本兜底）
- `electron/backend/diary/routes.js`（如需前置校验/错误映射）
- `tests/services/business-services.test.mjs` 或 `tests/services/diary-service.test.mjs`（新增空条目用例）

## 设计要求

### 1. 兜底策略

- 生成入口：`const entry = getEntry(...) ?? {}`，`userText`/`cornieText` 缺失时按空字符串处理（generator 已有 `|| '（空）'` 兜底的沿用）。
- 若业务上"无条目不可生成"是正确语义，则路由前置返回 404 语义错误（`HttpError(404, '这天还没有日记')`），而非 500——二选一，以行为友好为准（推荐：允许生成空文本，或 404 明确提示，二选一并配测试）。

### 2. 错误语义

- 任何路径都不再出现 TypeError → 500；错误响应为结构化 `{error}`。

## 验收标准

1. 新增测试通过：对无条目日期调 regenerate → 不抛 TypeError（返回兜底文本或 404 语义错误）；有条目日期行为不变。
2. 既有 diary 相关测试不回归；`npm run test:full` 全绿。
3. 提交为 `fix(backend): ...` 单提交，符合 commit 规范。

## 依赖

- 无（独立；若采用 404 语义，与 BE-03 的 HttpError 用法一致）。
