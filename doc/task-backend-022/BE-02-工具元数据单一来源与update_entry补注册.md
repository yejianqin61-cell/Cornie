# BE-02 工具元数据单一来源与 update_entry 补注册（Single Tool Metadata Source）

## 背景

写工具名单三处手写且已分裂（Cornie-022 §3.3.1 B2 + §3.3.2 N3）：

- `agent/jsonProtocol.js:81-91`：类目域工具名单（`ledger.add_expense/add_income/update_entry`、`todo.create/update`、`schedule.create/update`）。
- `agent/orchestrator.js:138-152`：同一 7 名单（写工具成功判定）。
- `agent/prompts/categoryMappingPrompt.js:41-49`：提示文本**只列 6 个（缺 `ledger.update_entry`）**。
- `category/domainRegistry.js`：各域 actionToolNames 均**缺 `ledger.update_entry`**（ledger 只注册 add_expense/add_income）。

后果：同一次 `ledger.update_entry`，协议层按类目域校验参数（needsNewCategory/proposedCategoryName 互斥），策略层 `applyLedgerRule` 经 `getDomainByActionTool` 查不到它 → 不做类目映射/追问/建类目确认，提示词也不教模型填类目——三层不同待遇。

## 目标

1. `domainRegistry` 补注册 `ledger.update_entry`（加入 actionToolNames 与类目域规则）。
2. jsonProtocol 类目校验名单、orchestrator 写工具判定名单、prompt 提示文本全部从**单一元数据源派生**（消除手写三份）。
3. `ledger.update_entry` 在协议/策略/提示三层获得一致的类目处理。

## 范围

- `electron/backend/category/domainRegistry.js`（ledger 域注册 update_entry + validateToolCall/类目分支）
- `electron/backend/agent/jsonProtocol.js`（名单改为从元数据派生）
- `electron/backend/agent/orchestrator.js`（写工具成功判定名单改为从元数据派生）
- `electron/backend/agent/prompts/categoryMappingPrompt.js`（提示文本从元数据生成）
- `electron/backend/policy/rules.js`（applyLedgerRule 对 update_entry 生效——经 getDomainByActionTool 命中后走类目追问/确认）
- `tests/protocol/json-protocol.test.mjs`、`tests/policy/tool-policy.test.mjs`、`tests/tools/registry-gateway.test.mjs`（新增 update_entry 用例）

## 设计要求

### 1. 单一元数据源

- 以 `domainRegistry`（或导出该注册表的轻量模块）为唯一事实源：每个类目域声明 `actionToolNames`、`validateToolCall`、类目列表获取等。
- jsonProtocol 的"是否为类目域工具"判定、orchestrator 的"写工具成功"判定、prompt 的域提示文本，均从该源派生（不复制名单字面量）。

### 2. update_entry 补注册

- ledger 域 actionToolNames 增加 `ledger.update_entry`；其 validateToolCall/类目语义与 add_expense 同族（金额/类目参数校验、proposedCategoryName 互斥等）。
- `applyLedgerRule` 对 update_entry 触发与 add_expense 一致的类目映射/追问/建类目确认。

### 3. 行为兼容

- 现有 add_expense/todo/schedule 等工具的协议与策略行为不变（回归判据）；仅 update_entry 从"泛化高风险确认"升级为"类目域处理"。

## 验收标准

1. 新增/更新测试通过：`ledger.update_entry` 带 `proposedCategoryName` 时触发建类目确认；缺类目时触发追问；jsonProtocol 校验与策略判定一致。
2. 全仓 grep：写工具名单不再有第二份手写字面量（除元数据源外）。
3. `tests/protocol`、`tests/policy`、`tests/tools` 全部通过；`npm run test:full` 全绿。
4. 提交为 `fix(backend): ...` 或 `refactor(backend): ...` 单提交，符合 commit 规范。

## 依赖

- 无（独立可先行；与 BE-03 无文件冲突交集风险低）。
