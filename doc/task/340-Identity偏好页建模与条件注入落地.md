# 340-Identity偏好页建模与条件注入落地

## 1. 任务目标

落实 `identity_preference` 的页面模型、读写规则与条件注入策略，让用户稳定偏好从聊天散点信息升级为正式长期记忆页。

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/memory-wiki/`
- `electron/backend/agent/wikiContext.js`
- `electron/backend/orchestrator.js`
- `src/renderer/components/MemoryWikiWorkspace.vue`

## 4. 当前问题

虽然已经有 `identity_preference` 类型，但还没有形成：

- 偏好页的推荐正文结构
- 稳定性 / 证据数 / 最近确认时间等字段的写入规则
- 与当前话题相关时的条件注入机制

## 5. 目标设计

- 支持偏好页结构化存储
- 偏好页默认不高频注入
- 当聊天主题命中偏好相关关键词时优先补查 / 注入
- 偏好页支持来源追溯与后续人工修订

## 6. 实现步骤

### Step 1

补齐偏好页字段约定与推荐正文模板。

### Step 2

在记忆写入链路中区分“偶发表达”和“稳定偏好候选”。

### Step 3

在 `wikiContext` 中加入偏好页条件注入逻辑，避免无关场景塞入 prompt。

## 7. 测试点

- 可创建 / 更新偏好页
- 偏好页不会像主身份页一样每轮强注入
- 命中相关话题时可召回偏好页摘要

## 8. 完成标准

- 偏好记忆具备正式页面模型
- 条件注入策略在代码中有明确落点

## 9. 提交建议

`feat(memory-wiki): add identity preference page flow`
