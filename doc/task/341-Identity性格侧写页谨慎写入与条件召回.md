# 341-Identity性格侧写页谨慎写入与条件召回

## 1. 任务目标

落实 `identity_trait` 的谨慎写入规则、证据门槛和情绪相关场景下的条件召回策略，避免模型武断地下用户性格结论。

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/memory-wiki/`
- `electron/backend/orchestrator.js`
- `electron/backend/agent/wikiContext.js`
- `electron/backend/memory-governance/`

## 4. 当前问题

当前没有针对 `identity_trait` 的专门治理规则，容易出现：

- 一次聊天就形成强结论
- 短期状态被误写成长期性格
- 缺少确认与证据门槛

## 5. 目标设计

- `identity_trait` 必须带证据、置信度、稳定性
- 高风险 trait 写入进入确认流或治理候选
- 只在情绪、关系、压力等高相关话题下按需召回

## 6. 实现步骤

### Step 1

补齐 trait 页字段与推荐正文模板。

### Step 2

在写入链路中增加 trait 识别门槛和确认策略。

### Step 3

在上下文注入中实现 trait 页的低频条件召回。

## 7. 测试点

- 单次表达不会直接沉淀为高置信度 trait 页
- 高风险 trait 候选会进入确认 / 治理流
- 相关情绪场景下可召回 trait 摘要

## 8. 完成标准

- trait 页写入规则明确且保守
- trait 页召回不再无条件进入 prompt

## 9. 提交建议

`feat(memory-wiki): add guarded identity trait flow`
