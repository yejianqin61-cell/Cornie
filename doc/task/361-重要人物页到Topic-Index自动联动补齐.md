# 361-重要人物页到Topic-Index自动联动补齐

## 1. 目标

根据以下设计稿，补齐 `identity_person` 与 `Topic Index` 的自动双向联动主链，让重要人物在自动沉淀为长期记忆页后，同时形成可检索、可回溯、可跨天召回的主题索引项。

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 2. 涉及范围

- `electron/backend/identity/personUpsert.js`
- `electron/backend/memory-wiki/topicIndex.js`
- `electron/backend/memory-wiki/service.js`
- `electron/backend/agent/wikiContext.js`
- `scripts/`

## 3. 背景

当前系统已经支持：

- 重要人物从对话中自动沉淀到 `identity_person`
- 人物页与主身份页建立相关页关系
- `Topic Index` 独立存储与人工链接能力

但还没有形成主链闭环：

- 自动创建的人物页不会自动生成对应 Topic
- 人物名、别名、日期、聊天来源还没有在人物沉淀时自动补进 Topic
- 后续再次提到该人物时，Topic 层无法稳定承担“快速定位相关日期和来源”的职责

这与设计稿里“人物页是正文，Topic 是索引”的要求还不一致。

## 4. 需求拆解

### 4.1 创建人物页时自动联动 Topic

当 `identity_person` 首次创建成功后，应自动：

- 以 `personName` 作为主 keyword
- 以人物页标题、别名作为 aliases
- 链接 `memoryPageIds`
- 写入当天日期到 `dates`
- 写入聊天来源到 `chatRefs`
- 根据人物页重要性同步 `importance`

### 4.2 更新人物页时增量补链 Topic

当已有 `identity_person` 被再次提及时，应自动：

- 补充新的 `date`
- 补充新的 `chatRef`
- 补充新别名
- 确保 `memoryPageIds` 持续包含当前人物页
- 更新 `lastMentionedAt`

### 4.3 不重复写脏数据

自动联动必须具备幂等性：

- 同一天重复写入不应产生重复 `date`
- 同一条聊天来源不应重复进入 `chatRefs`
- 同一人物页不应重复进入 `memoryPageIds`

### 4.4 人物 Topic 的读取语义不变

本任务不改造前端和人工治理界面，但要保证：

- 后续 Topic 详情页能直接读到这些自动补齐的数据
- `wikiContext` / 补查工具可以继续沿用现有 Topic 结构

## 5. 实现要求

### 5.1 新增人物 Topic 联动帮助函数

在人物自动沉淀链路中封装专门的 Topic 补链逻辑，避免把联动细节散落在主流程里。

### 5.2 优先使用人名作为 Topic 主键

主键规则：

- `normalizedKey = personName.toLowerCase()`
- `keyword = personName`
- `aliases` 由人名、标题、人物页 aliases 合并去重

### 5.3 来源链路要求

聊天来源应记录到 Topic：

- 至少写入 `date`
- 至少写入 `chatRefs`

后续人物 Topic 命中后，系统可以快速反查该人物在哪些日期被提到过。

## 6. 验收标准

- 首次人物自动沉淀时会自动生成对应 Topic
- 再次提及同一人物时会增量补齐 Topic，而不是只更新人物页
- Topic 中能看到：
  - `keyword`
  - `aliases`
  - `dates`
  - `chatRefs`
  - `memoryPageIds`
- 重复执行不会产生重复数据
- 补一份可执行验证脚本
- `npm run build` 通过

## 7. 建议提交信息

`feat(identity): auto-link person pages into topic index`
