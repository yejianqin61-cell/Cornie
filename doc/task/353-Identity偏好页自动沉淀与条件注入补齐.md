# 353-Identity偏好页自动沉淀与条件注入补齐

## 1. 任务目标

补齐 `identity_preference` 的自动沉淀、稳定性字段维护与条件注入规则，让用户长期偏好可以从对话中逐步进入 Wiki，并只在相关场景下召回。

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/identity/`
- `electron/backend/memory-wiki/service.js`
- `electron/backend/agent/wikiContext.js`
- `src/renderer/components/MemoryWikiWorkspace.vue`

## 4. 当前问题

偏好页已有结构，但还缺：

- 对话到偏好页的自动沉淀策略
- `evidenceCount / stabilityLevel / lastConfirmedAt` 的维护
- 条件注入时机的进一步收口

## 5. 目标设计

- 对明显偏好表达形成候选沉淀
- 多次证据提升稳定性
- 仅在当前话题相关时注入 prompt

## 6. 实现步骤

### Step 1

定义偏好候选提取规则与去重键。

### Step 2

实现偏好页 upsert 与证据计数更新。

### Step 3

收口偏好页的条件注入边界。

## 7. 测试点

- 重复偏好表达可累计证据
- 偏好页不会无限重复创建
- 无关场景不高频注入偏好页

## 8. 完成标准

- `identity_preference` 从“可手动编辑”升级为“可稳定沉淀、可按需召回”

## 9. 提交建议

`feat(identity): add preference memory extraction flow`
