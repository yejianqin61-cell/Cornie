# 354-Identity性格侧写谨慎写入与确认边界补齐

## 1. 任务目标

为 `identity_trait` 建立比偏好更保守的写入门槛，确保性格侧写只在证据足够或人类确认后进入长期记忆，避免误判。

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/identity/`
- `electron/backend/memory-wiki/service.js`
- `electron/backend/memory-wiki/governanceStore.js`
- `src/renderer/components/MemoryWikiWorkspace.vue`

## 4. 当前问题

性格侧写虽然已有页模型和基础治理候选，但：

- 还没有真正的对话提取与判定规则
- 证据不足时的降级与确认边界还不清晰

## 5. 目标设计

- 只有高置信或多证据场景才允许自动沉淀
- 其余情况进入候选或保持在观察日志层
- 侧写注入默认轻量、按需召回

## 6. 实现步骤

### Step 1

定义性格侧写候选的最小证据要求。

### Step 2

补齐侧写候选到治理候选池的落点。

### Step 3

收口侧写注入与展示边界。

## 7. 测试点

- 单次偶发情绪不会直接形成长期性格结论
- 低证据 trait 会进入治理候选
- 情绪相关场景可轻量召回 trait 摘要

## 8. 完成标准

- `identity_trait` 的写入和注入都更克制、更可信

## 9. 提交建议

`feat(identity): tighten trait memory governance`
