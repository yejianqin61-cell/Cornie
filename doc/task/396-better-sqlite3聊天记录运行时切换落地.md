# 396-better-sqlite3聊天记录运行时切换落地

## 1. 任务目标

根据 `doc/design/Cornie-0630-聊天记录存储与历史归档改造方案.md`，将聊天记录运行时主驱动从默认 `sql.js` 切换到 `better-sqlite3`，保留现有 API 契约不变，只替换底层存储实现与生命周期管理。

## 2. 任务来源

- `Cornie-0630-聊天记录存储与历史归档改造方案.md` 第 5.2、7、8 节

## 3. 涉及范围

- `electron/backend/chatlog/repository.js`
- `electron/backend/chatlog/service.js`
- `electron/server.js`
- 启动配置与验证脚本

## 4. 目标设计

- 默认 chatlog repository driver 切到 `better-sqlite3`
- 保留 `sql.js` 作为兼容或测试 fallback
- 明确连接初始化、关闭、异常恢复策略
- 补专项验证：写入、分页、检索、历史读取、进程关闭

## 5. 完成标准

- 聊天记录运行时不再依赖整库 export 模式
- 现有聊天相关 API 与前端行为不回归

## 6. 提交建议

`refactor(chatlog): switch runtime driver to better-sqlite3`
