# Cornie-039 批次 C 施工收口简报

## 1. Headline

**本轮：5 项变更，全部完成；对话页的状态、可访问性与壳层进入可发布状态。**

窗口：2026-10-24 00:33–00:42。基线：`Cornie-036 对话模块前端审计报告` 的批次 C（P-12～P-15）。

| # | Change | Where | Kind | State | What it means for the reader |
|---|---|---|---|---|---|
| C-1 | 空/错/载状态复用通用组件，消息区成为 live log，补 h1、main 地标与全局 focus ring | chat 历史页、common 状态组件、布局、`main.css` | Fixed | Done | 状态可见可播报，键盘用户能看到焦点，空态能区分今天与历史某天 |
| C-2 | 删除 4 个零引用组件与 3 个零调用 API | chat 目录、chat/conversation API | Removed | Done | 仓库不再保留看似可用、实际从不渲染的展示层 |
| C-3 | 增加日期摘要条与当日 JSON 导出 | `ChatHistoryPage.vue`、`api/chatlog.js` | New | Done | 当前读的是哪天、有多少条一目了然，记录可以带走 |
| C-4 | 去掉 API 客户端逐行注释，补一条不打桩的发送集成测试 | `client.js`、`ChatPanel.integration.test.js` | Fixed | Done | 代码符合项目规则，测试覆盖真实子组件接口 |
| C-5 | 移除无 IPC 的窗口按钮与假统计，消息行加 `v-memo` | `CornieTopBar.vue`、`App.vue`、`ChatHistoryPage.vue` | Fixed | Done | 界面不再展示不存在的功能，长列表少做无意义重渲染 |

Routine：4 份任务 brief、10 个提交、全量前端 175 例通过、`npm run lint` 通过。

## 2. What it means

审计报告的最后一批缺口收掉了：界面状态从“各写各的”收敛到通用组件，壳层不再展示点击无反应的按钮和写死的数字。

运行时复验（重建产物后跑隔离截图脚本）：顶栏窗口按钮数为 0，状态栏只剩 `v0.1.0`，空态文案为“今天还没有聊天记录”，确认卡与对话仍正常。截图与测量在 `doc/assets/cornie-039-batch-c/`。

`EmptyState` 的 icon prop 已改为接受函数组件，之前测试里的 Vue 警告随之消失。

## 3. Still open

- 记忆引用提示没有接线：当前没有按消息持久化的召回数据，`MemoryHint` 已删除，等数据源再做。
- 后端还有搜索片段入口未接；导出目前只提供 JSON。
- 本轮只跑了前端 Vitest 与 lint，`test:full` 里的后端 Node 测试与 legacy verify 脚本未重跑。
- 消息排序没有第二排序键，记忆提炼仍阻塞 done，逐字符 delta 仍每次触发更新。
- 真机中文输入法、读屏播报、125%/150% 缩放仍未验证。
