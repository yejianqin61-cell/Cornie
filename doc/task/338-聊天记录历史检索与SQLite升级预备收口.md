# 338-聊天记录历史检索与SQLite升级预备收口

## 1. 任务目标

基于 0630 聊天记录改造方案，补齐历史聊天“全部月份 / 搜索 / 分页预备接口”的基础能力，并为后续 `better-sqlite3` 升级铺路。

## 2. 任务来源

- `doc/design/Cornie-0630-聊天记录存储与历史归档改造方案.md`

## 3. 涉及范围

- `electron/db.js`
- `electron/backend/chatlog/service.js`
- `electron/backend/chatlog/routes.js`
- `src/renderer/ChatHistory.vue`
- `src/renderer/components/ChatDayView.vue`

## 4. 当前问题

当前历史聊天虽已可查看，但仍缺：

- 全量月份视角
- 关键词搜索入口
- 单日超长分页 / 懒加载预留
- 存储驱动升级前的抽象收口

## 5. 目标设计

- 历史页支持更清晰的月份 / 全部历史入口
- 提供关键词搜索日期能力
- 后端查询结构为后续分页保留扩展位
- 不在本任务中直接切换 `better-sqlite3`，但清理升级阻力

## 6. 实现步骤

### Step 1

补历史页搜索与筛选体验。

### Step 2

扩展 chatlog service 查询返回结构，为分页和命中片段预留字段。

### Step 3

梳理数据库驱动升级前的查询边界。

## 7. 测试点

- 历史聊天可按关键词找到相关日期
- 历史页月份切换更明确
- 查询结构兼容现有前端

## 8. 完成标准

- 历史聊天检索体验明显增强
- 后续 SQLite 驱动升级阻力降低

## 9. 提交建议

`feat(chatlog): prepare searchable archive flows`
