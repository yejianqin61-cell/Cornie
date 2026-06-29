# 339-Wiki主链替换与旧memory-entries退场收口

## 1. 任务目标

让 Memory Wiki 成为唯一正式长期记忆主源，停止旧 `memory_entries` 在主链路中的继续承载与默认注入职责。

本任务完成后，应至少具备：

- 聊天后长期记忆写入主链明确收口到 Wiki
- `memory_entries` 不再承担默认跨天记忆注入职责
- 旧链路仍可保留只读兼容，但不再影响模型主记忆判断

## 2. 任务来源

- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/orchestrator.js`
- `electron/backend/memory/`
- `electron/backend/agent/contextBuilder.js`
- `electron/backend/agent/promptBuilder.js`
- `electron/backend/memory-wiki/`

## 4. 当前问题

当前系统存在两套长期记忆链路并存：

- 旧链路：`memory_entries`
- 新链路：Memory Wiki

结果是：

- 写入来源不统一
- 跨天注入主源不清晰
- 用户会出现“昨天记得，今天忘了”的断层体验

## 5. 目标设计

- Wiki 成为唯一正式长期记忆主源
- 旧 `memory_entries` 降级为迁移兼容层或历史残留层
- Prompt 构建不再依赖 legacy summary 作为默认主注入内容
- 新的长期记忆写入候选优先进入 Wiki / 治理流

## 6. 实现步骤

### Step 1

梳理聊天后自动记忆提炼链路，标出旧 `memory_entries` 的写入入口和读取入口。

### Step 2

关闭或降级旧链路在主编排中的默认写入 / 注入角色，保留最小兼容兜底。

### Step 3

补充说明性日志、注释或结构化标记，确保后续维护时能明确区分“正式主链”和“兼容残留”。

## 7. 测试点

- 聊天后高价值记忆不再只进入 `memory_entries`
- Prompt 默认长期记忆摘要来自 Wiki 而非旧链路
- 旧链路残留数据不会重新抢占主记忆优先级

## 8. 完成标准

- Memory Wiki 成为唯一正式长期记忆主源
- 旧 `memory_entries` 不再承担主记忆职责

## 9. 提交建议

`refactor(memory): retire legacy memory entries from primary flow`
