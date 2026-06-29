# 358-Identity主身份页稳定字段与注入摘要边界补齐

## 1. 任务目标

根据最新 Identity 设计稿，补齐主身份页的稳定字段表达、正文模板与默认注入摘要边界，确保跨天场景下“名字、称呼、关系、阶段画像”能持续稳定进入模型上下文。

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/memory-wiki/service.js`
- `electron/backend/agent/wikiContext.js`
- `electron/backend/identity/profileUpsert.js`
- `scripts/`

## 4. 当前问题

当前主身份页已经能自动沉淀名字和关系，但仍缺少对以下内容的持续结构化维护：

- `identitySummary`
- `lifeStageSummary`
- `currentFocus`
- `stressors`
- `communicationPreference`

同时，默认注入摘要边界还需要进一步对齐最新设计稿。

## 5. 目标设计

- 主身份页继续保持最高优先级默认注入
- 注入内容以结构化摘要为主，不直接塞正文全文
- 对阶段画像类字段保持保守更新，避免一次聊天就重写整体画像
- 在 summary 模板中明确区分：
  - 名字/称呼
  - 与 Cornie 的关系
  - 当前阶段
  - 当前关注点

## 6. 实现步骤

### Step 1

补主身份页字段更新策略和保守合并规则。

### Step 2

统一 summary 模板与 prompt 注入表达。

### Step 3

对无关 query 保持轻注入，对相关 query 允许补更多身份细节。

## 7. 测试点

- 主身份页摘要跨天稳定注入
- 无关 query 不会过度注入长身份画像
- 冲突身份信息不会被无声覆盖

## 8. 完成标准

- 主身份页的稳定摘要与注入边界与 0630 设计稿一致

## 9. 提交建议

`feat(identity): refine profile summary injection boundaries`
