# 363-聊天记录Repository抽象与better-sqlite3驱动迁移骨架

## 1. 目标

根据聊天记录改造设计稿，正式把聊天记录数据访问层抽象为可切换驱动结构，为后续从 `sql.js` 迁移到 `better-sqlite3` 做准备，但本任务不强制一次性完成全量迁移。

- `doc/design/Cornie-0630-聊天记录存储与历史归档改造方案.md`

## 2. 涉及范围

- `electron/backend/chatlog/repository.js`
- `electron/backend/chatlog/service.js`
- `electron/backend/chatlog/routes.js`
- `scripts/`

## 3. 任务要求

- 抽象统一 repository 接口
- 显式暴露当前驱动能力信息
- 为 `better-sqlite3` 预留驱动注册点
- 不破坏现有 API 契约

## 4. 验收标准

- 现有聊天记录接口继续可用
- 底层驱动信息可观测
- 代码结构允许后续追加 `better-sqlite3` 实现
- 补验证脚本并通过 `npm run build`

## 5. 建议提交信息

`refactor(chatlog): add swappable repository driver skeleton`
