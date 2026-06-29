# 347-Identity主身份页结构化字段与摘要模板补齐

## 1. 任务目标

根据 `Cornie-0630-Identity记忆实体模型与页面结构设计.md`，把 `identity_profile` 从“只有 title/summary/body 的普通页”升级为正式的主身份页实体，补齐结构化字段、默认摘要模板、正文模板、前后端读写契约，以及对话上下文中的稳定注入表达。

本任务完成后，应至少具备：

- `identity_profile` 的结构化字段正式落入 page model / storage / service
- Markdown frontmatter 可持久化这些字段
- 创建或更新主身份页时可自动生成默认 summary/body 模板
- `wikiContext` 对主身份页的摘要不再只依赖通用 summary，而是能表达：
  - 用户名字
  - 偏好称呼
  - 用户与 Cornie 的关系
  - 当前阶段摘要
- 前端 Memory Wiki 工作台可编辑这些字段

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/memory-wiki/pageModel.js`
- `electron/backend/memory-wiki/storage.js`
- `electron/backend/memory-wiki/service.js`
- `electron/backend/agent/wikiContext.js`
- `src/renderer/api.js`
- `src/renderer/components/MemoryWikiWorkspace.vue`

## 4. 当前问题

当前虽然已经支持 `identity_profile` 页类型，并且会在 `wikiContext` 中优先挑选一页做稳定注入，但仍存在明显缺口：

- 没有正式的主身份字段模型
- 无法单独记录：
  - `user_name`
  - `preferred_name`
  - `cornie_relationship`
  - `identity_summary`
  - `life_stage_summary`
  - `current_focus`
  - `stressors`
  - `communication_preference`
- 主身份页摘要仍偏泛化，不足以稳定解决“第二天忘记名字和关系”的问题

## 5. 目标设计

### 5.1 字段模型

为 `identity_profile` 增加结构化字段：

- `userName`
- `preferredName`
- `cornieRelationship`
- `identitySummary`
- `lifeStageSummary`
- `currentFocus`
- `stressors`
- `communicationPreference`

### 5.2 自动模板

当 `identity_profile` 缺少 `summary/body` 时，应自动生成：

- 一个压缩 summary
- 一个可读的 Markdown body

避免主身份页刚创建时仍是一张空壳页。

### 5.3 稳定注入摘要

`wikiContext` 在构建主身份摘要时，应优先使用上述结构化字段，形成更稳定的摘要行，而不是只打印一条泛用 summary。

## 6. 实现步骤

### Step 1

扩展 `identity_profile` 的 page model 与 frontmatter 映射。

### Step 2

在 service 层加入主身份页默认 summary/body 模板生成。

### Step 3

调整 `wikiContext` 的主身份摘要构建逻辑。

### Step 4

补齐前端工作台编辑表单。

## 7. 测试点

- `identity_profile` 页面保存后结构化字段可读回
- 未手填 summary/body 时会自动生成默认模板
- `wikiContext.memorySummary` 能稳定输出名字和关系摘要
- 前端工作台可修改并再次保存这些字段

## 8. 完成标准

- 主身份页正式结构化
- 主身份摘要不再依赖泛化空 summary
- 为后续自动 Identity 写入链路打好主锚点

## 9. 提交建议

`feat(memory-wiki): add structured identity profile fields`
