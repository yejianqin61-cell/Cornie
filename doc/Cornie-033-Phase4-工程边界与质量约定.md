# Cornie Phase 4 工程边界与质量约定

**日期：** 2026-10-23

**结论：** 当前产品沿用 Vue 渲染层、renderer API、本地 Express 路由和领域服务四层边界。
新增业务链必须复用已有层，不在页面或路由旁边再造一套服务。

## 模块边界

| 层 | 责任 | 允许依赖 |
|---|---|---|
| Vue 页面与组件 | 展示状态、触发用户动作、翻译错误 | `src/renderer/api` |
| renderer API | 组装路径、请求体和响应形状 | `src/renderer/api/client.js` |
| Express 路由 | 校验 HTTP 输入、调用领域服务、返回结果 | `electron/backend/**/routes.js` |
| 领域服务 | 执行业务规则、事务语义和持久化 | store、领域仓储和工具 |
| Electron 主进程 | 启动本地服务、提供桌面运行环境 | `electron/server.js` |

页面不得直接调用 `fetch` 或拼接 `/api` 路径。
renderer API 不复制领域规则，也不保存页面状态。
路由不绕过领域服务直接改数据库或文件。

## 错误模型

后端领域错误在服务层保留原因，在 HTTP 边界转换为 `HttpError` 或带稳定 `code` 的结构化响应。
`jsonErrorHandler` 只返回 `error`、可选 `code` 和可选 `details`，不向客户端返回堆栈。
renderer API 将非成功响应转换为 `Error`，页面在用户动作边界展示可重试的中文反馈。

错误分层保持以下语义：

- 参数不完整或不合法：返回 400，并保留业务错误码或细节。
- 资源不存在：返回 404，页面说明目标已不存在或已刷新。
- 状态冲突：返回 409，页面阻止重复提交并提示当前状态。
- 未预期故障：返回 500，服务记录诊断信息，页面给出通用重试入口。

## 业务链复用规则

新增页面先搜索对应的 renderer API 和已有路由。
新增写操作先复用领域服务、状态迁移和持久化方法。
新增错误先复用现有 `HttpError`、`code` 和 UI 错误展示路径。
新增测试优先复用本地服务 harness 和真实 HTTP 契约，不访问外网。
不新增平行服务、不新增平行错误类型、不用兼容层遮住契约漂移。

## 业务链复用映射

| 业务链 | 页面入口 | renderer API | 后端复用 |
|---|---|---|---|
| 聊天链：conversation、chatlog、confirm | `ChatPanel`、`ConfirmCard` | `conversation.js`、`chatlog.js`、`confirm.js` | conversation、chatlog、confirm |
| 日常业务链：ledger、todo、schedule | 对应 HomePage 和表单 | `ledger.js`、`todo.js`、`schedule.js` | ledger、todo、schedule |
| 记录链：diary、observation、settings | 日记、观察、设置页 | 对应 renderer API 模块 | diary、observation、settings |
| 记忆演示链：memory-wiki、governance | `MemoryWikiHomePage` | `memory-wiki.js` | memory-wiki、governance |

业务链只在页面组合已有 API，不把领域字段转换散落到模板。
跨模块演示先复用各自的服务，再由真实契约测试证明组合顺序。

## 变更检查

提交前必须确认：

1. 页面只从 renderer API 取数。
2. API 路径和字段与后端路由契约一致。
3. 领域规则仍由已有服务执行。
4. 失败响应在 UI 可见，并保留重试或恢复动作。
5. 业务链有一个真实契约测试和一个前端行为测试。
