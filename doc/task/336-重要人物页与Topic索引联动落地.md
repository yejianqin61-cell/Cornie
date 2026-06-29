# 336-重要人物页与Topic索引联动落地

## 1. 任务目标

为 `identity_person` 页面建立正式人物实体结构，并与 Topic Index 建立联动，使关键人物可以按名字、日期、聊天、观察日志快速召回。

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/memory-wiki/`
- `electron/backend/observation/topicLink.js`
- `electron/backend/agent/wikiContext.js`
- `src/renderer/components/MemoryWikiWorkspace.vue`

## 4. 当前问题

当前 `person` 更像泛人物页，还没有 Identity 人物页的专门结构。  
同时 Topic Index 虽能记关键词，但没有明确规定与人物页的正式联动策略。

## 5. 目标设计

- 新增 `identity_person` 人物页类型
- 人物页正文至少包含：
  - 关系
  - 身份
  - 性格
  - 和用户的共同经历
- 人物页与 Topic Index 双向关联
- 用户提及关键人物时，优先命中该人物页摘要

## 6. 实现步骤

### Step 1

补人物页结构与前端展示入口。

### Step 2

定义人物页与 Topic Index 的映射规则。

### Step 3

在上下文召回侧，优先根据人名 / 别名命中人物页。

## 7. 测试点

- 人物页可正常创建和读取
- Topic Index 可关联人物页
- 通过人物名能召回相应页与日期线索

## 8. 完成标准

- 重要人物从“普通记忆页”升级为正式人物实体
- Topic Index 可用于人物快速定位

## 9. 提交建议

`feat(memory-wiki): link identity person pages with topic index`

