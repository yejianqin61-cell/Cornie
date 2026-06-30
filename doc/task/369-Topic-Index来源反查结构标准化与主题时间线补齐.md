# 369-Topic-Index来源反查结构标准化与主题时间线补齐

## 1. 目标

根据 0630 三份设计稿，继续补齐 `Topic Index` 的来源反查能力，让主题详情不只是原始 `chatRefs / observationRefs` 字符串，而是稳定、可前端直接消费的结构化来源结果与主题时间线。

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-聊天记录存储与历史归档改造方案.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 2. 背景

当前 `memoryWiki.getTopicSourceTrace(normalizedKey)` 已有基础返回，但仍存在几个问题：

- `chatRefs` 只被粗略映射为日期标题，缺少消息存在性与预览信息
- `observationRefs` 的读取没有正确解析 `date#observationId` 结构
- 缺少主题级的日期聚合与时间线结构

这与设计稿中“Topic Index 负责快速定位某主题在哪些日期、哪些聊天、哪些观察、哪些记忆页里出现过”的目标还不完全一致。

## 3. 涉及范围

- `electron/backend/memory-wiki/service.js`
- `scripts/`

## 4. 任务要求

### 4.1 标准化 chat source trace

`getTopicSourceTrace()` 返回的 `chatSources` 应至少包含：

- `date`
- `messageId`
- `exists`
- `preview`
- `title`

其中：

- `chatRef` 需要按 `date#messageId` 正确解析
- 若找不到消息，也应返回 `exists: false`

### 4.2 标准化 observation source trace

`getTopicSourceTrace()` 返回的 `observationSources` 应至少包含：

- `date`
- `observationId`
- `type`
- `title`
- `exists`
- `preview`

其中：

- `observationRef` 需要按 `date#observationId` 正确解析
- 不允许继续把整条 ref 当 observationId 直接查库

### 4.3 新增 topic timeline trace

为 Topic 详情提供稳定聚合字段，至少包含：

- `chatDates`
- `observationDates`
- `timeline`
- `relatedMemoryPages`

并按日期去重排序。

## 5. 验收标准

- `getTopicSourceTrace()` 的 `chatSources` 与 `observationSources` 结构化完整
- `observationRefs` 能被正确解析
- 新增 `topicTimelineTrace`
- 新增验证脚本
- `npm run build` 通过

## 6. 建议提交信息

`feat(memory-wiki): normalize topic source trace aggregation`
