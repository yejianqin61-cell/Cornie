# 350-旧memory-entries主链退场与兼容边界收口

## 1. 任务目标

根据 `Cornie-0630-记忆层改进治理总纲-第一版.md`，让 Memory Wiki 成为唯一正式长时记忆主源，停止旧 `memory_entries` 继续承担主链写入职责，并明确其只读兼容边界。

## 2. 任务来源

- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/agent/orchestrator.js`
- `electron/backend/memory/service.js`
- `electron/backend/agent/contextBuilder.js`
- `electron/backend/agent/promptBuilder.js`

## 4. 当前问题

当前仓库里旧 `memory_entries` 仍然存在完整 CRUD 与搜索能力，但新的长时记忆主链已经是 Memory Wiki。

如果不收口，会出现：

- 维护者误以为旧表仍在主链工作
- 未来再次被无意接回 prompt 主链
- 对话后长时记忆双写、主源不清

## 5. 目标设计

- 停止 orchestrator 主流程继续向旧 `memory_entries` 自动沉淀
- 明确旧 `memory` 模块为兼容残留层
- 保持旧表结构不强行删除，避免破坏历史数据
- 用注释或结构化命名表达“非主链”

## 6. 实现步骤

### Step 1

排查当前是否仍存在对旧 `memory_entries` 的主流程写入。

### Step 2

关闭或降级这些主链写入入口。

### Step 3

补兼容说明和边界注释，避免未来误接回主链。

## 7. 测试点

- 主对话流程不再默认写入旧 `memory_entries`
- Prompt 主摘要仍完全来自 Wiki 主链
- 历史旧表不会被误删

## 8. 完成标准

- 旧 `memory_entries` 退出主链
- Memory Wiki 主源边界清晰

## 9. 提交建议

`refactor(memory): retire legacy memory entries from primary flow`
