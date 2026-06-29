# 344-聊天记录检索接口抽象与better-sqlite3迁移准备

## 1. 任务目标

在不立即切换数据库驱动的前提下，为聊天记录历史检索、分页和后续 `better-sqlite3` 迁移先做接口抽象与查询结构收口。

## 2. 任务来源

- `doc/design/Cornie-0630-聊天记录存储与历史归档改造方案.md`

## 3. 涉及范围

- `electron/db.js`
- `electron/backend/chatlog/service.js`
- `electron/backend/chatlog/routes.js`
- `src/renderer/api.js`

## 4. 当前问题

当前聊天记录的存储还基于 `sql.js`，查询结果结构也更偏当前实现细节，不利于后续无痛迁移。

## 5. 目标设计

- chatlog service 输出统一查询契约
- 为分页、命中片段、总数等信息预留字段
- 路由层与前端侧不直接耦合底层存储实现

## 6. 实现步骤

### Step 1

梳理历史聊天查询接口的现有返回结构。

### Step 2

为列表查询、按日查询、搜索查询统一响应契约。

### Step 3

补充最小适配层，降低后续 `better-sqlite3` 替换成本。

## 7. 测试点

- 现有历史聊天页面不受影响
- 查询结构包含后续分页和搜索扩展位
- 底层驱动替换点收口清晰

## 8. 完成标准

- 聊天记录查询接口与底层存储解耦程度提升
- `better-sqlite3` 迁移阻力降低

## 9. 提交建议

`refactor(chatlog): unify archive query contract for sqlite migration`
