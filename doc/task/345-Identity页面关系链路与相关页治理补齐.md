# 345-Identity页面关系链路与相关页治理补齐

## 1. 任务目标

补齐 `identity_profile`、`identity_person`、`identity_preference`、`identity_trait` 之间的页面关系链路，让 Identity 不只是孤立页面集合，而是可追踪、可治理、可回溯的关系网络。

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/memory-wiki/`
- `src/renderer/components/MemoryWikiWorkspace.vue`
- `src/renderer/api.js`

## 4. 当前问题

当前虽然已有 `relatedPageIds` 通用能力，但还没有形成 Identity 专项的关系使用规则：

- `identity_profile -> identity_person`
- `identity_profile -> identity_preference`
- `identity_profile -> identity_trait`
- `identity_person -> identity_trait`

这些关系既没有专门的前端操作入口，也没有治理提示与使用约束。

## 5. 目标设计

- 明确 Identity 页面关系的推荐链路与约束
- 支持在 Memory Wiki 工作台中建立、查看、调整相关页
- 为后续治理、合并、注入策略提供稳定关系基础

## 6. 实现步骤

### Step 1

补齐 Identity 页面关系的后端读写与摘要表达。

### Step 2

在 Memory Wiki 工作台中提供相关页选择与编辑入口。

### Step 3

为错误关系、空关系、孤立关系预留治理提示落点。

## 7. 测试点

- 可为 Identity 页面设置相关页
- 人物页与主身份页之间的关系可稳定保存
- 前端可查看并修改相关页链路

## 8. 完成标准

- Identity 页面关系链路可用
- 相关页不再只是底层字段，而是有明确产品落点

## 9. 提交建议

`feat(memory-wiki): add identity relationship page linking`
