# 448 Verify-9.0 记忆提炼验收脚本

## 背景

Cornie-019 §8 T-7 要求为记忆提炼轮次建立集成验收脚本 `verify-9.0-memory-distillation.mjs`，覆盖 LLM 决策、正则弃用、不可用策略与否定句反例，并纳入 `test:full`。当前测试体系对记忆写入链无自动化覆盖（Cornie-018 D-14 测试盲区之一）。

## 目标

1. 新增 `scripts/verify-9.0-memory-distillation.mjs`，模拟 LLM 输出验证提炼轮次全链路。
2. 覆盖：LLM 提炼写入 / 全 skip / 非法 JSON / 无 Key 零写入 / 否定句反例。
3. 纳入 `npm run test:full` 与 package.json scripts。

## 范围

- 新增 `scripts/verify-9.0-memory-distillation.mjs`
- `package.json`（新增 `verify:9.0` script，并接入 `test:full` 或汇总 verify 脚本）

## 设计要求

### 1. 测试环境（沿用现有 verify 模式）

- 临时 SQLite store（`scripts/tmp-artifacts.mjs` 的 `createRuntimeSqlitePath` / `openDb`）。
- 临时 `baseDir`（`fs.mkdtempSync`），memory-wiki 数据落在临时目录，跑完清理。
- 通过注入 `chatFn`（443 已支持）或 mock `global.fetch`（沿用 verify-task053 模式）模拟 DeepSeek 响应。

### 2. 用例清单

| 用例 | 输入 | 断言 |
| --- | --- | --- |
| 提炼写入 | chatFn 返回合法 envelope：1 条 observation(create, 提炼事实) + 1 条 profile 字段提议 | 观察日志 content 为提炼事实（非原话拼接）；身份页含 LLM 字段值；审计含 `memory_distillation`、source=llm |
| 全 skip | chatFn 返回空数组 envelope | 零写入（无观察、无页面、无治理新增） |
| 非法 JSON | chatFn 返回非 JSON/非法 schema | 零写入；审计含不可用原因（无正则兜底执行） |
| 无 Key | 模拟模型未配置 | 零写入；返回状态含引导 Key 语义 |
| 否定句反例 | chatFn 对"我不累"返回空 envelope | 无 stressors 写入（配合 445） |
| 破坏性请求 | envelope 含 merge_pages | 页面未改；治理队列新增 pending 项 |

### 3. 接入

- `package.json`：`"verify:9.0": "node scripts/verify-9.0-memory-distillation.mjs"`。
- 纳入 `run-tests.mjs` full 模式或独立汇总 verify（参照 `verify:7.4` 串行模式）。

## 验收标准

1. `npm run verify:9.0` 全绿。
2. `npm run test:full`（或对应汇总入口）包含 9.0 且通过。
3. 用例对"观察日志为提炼事实非原话"有直接断言（对应 Cornie-018 I-18 验收点）。

## 依赖与衔接

- 依赖：443、444、445、446、447。
- 衔接：468（测试补强）可在此基础上扩展记忆层用例。
- 上游设计：Cornie-019 §8 T-7；Cornie-018 §6 验证与验收体系、I-18 验收点。
