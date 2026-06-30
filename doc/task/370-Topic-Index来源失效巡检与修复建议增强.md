# 370-Topic-Index来源失效巡检与修复建议增强

## 1. 目标

在 `369` 完成 Topic 来源结构标准化后，继续补齐 Topic 级来源失效巡检的可读化结果与修复建议表达，让治理层能更准确看懂“哪条主题引用坏了、坏在哪、该怎么修”。

- `doc/design/Cornie-0630-聊天记录存储与历史归档改造方案.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 2. 涉及范围

- `electron/backend/memory-wiki/inspector.js`
- `electron/backend/memory-wiki/service.js`
- `scripts/`

## 3. 任务要求

- 对 `missing_topic_chat_ref` 提供更完整的上下文
- 对 `missing_topic_observation_ref` 提供更完整的上下文
- 巡检结果中补充可直接展示的日期、ref 解析结果、主题名
- 修复建议继续保持机器可执行 payload

## 4. 验收标准

- Topic 来源失效类 issue 输出更完整上下文
- 不破坏现有 governance queue 契约
- 新增验证脚本
- `npm run build` 通过

## 5. 建议提交信息

`feat(memory-wiki): enrich topic trace repair suggestions`
