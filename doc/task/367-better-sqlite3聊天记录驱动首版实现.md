# 367-better-sqlite3聊天记录驱动首版实现

## 1. 目标

基于 `363` 已完成的 repository driver skeleton，正式落第一版 `better-sqlite3` 聊天记录驱动实现，完成聊天记录持久层从 `sql.js` 向原生 SQLite 驱动的可切换升级。

- `doc/design/Cornie-0630-聊天记录存储与历史归档改造方案.md`

## 2. 涉及范围

- `electron/backend/chatlog/repository.js`
- `electron/backend/chatlog/service.js`
- 聊天记录相关初始化代码
- `scripts/`

## 3. 任务要求

- 实现真实 `better-sqlite3` repository
- 保持现有 service 契约不变
- 支持至少以下能力：
  - 按日读取
  - 分页读取
  - 月份列表
  - 关键词检索
  - scope 浏览
- 提供驱动能力元信息
- 默认驱动切换策略需可控，不强制破坏当前本地数据

## 4. 验收标准

- repository abstraction 下新增可工作的 `better-sqlite3` 驱动
- 核心聊天记录读接口通过验证
- 兼容现有 service 层契约
- 新增验证脚本
- `npm run build` 通过

## 5. 建议提交信息

`feat(chatlog): add initial better-sqlite3 repository driver`
