# Cornie-037 批次 A 施工收口简报

## 1. Headline

**本轮：5 项修复，全部完成；对话的首启、默认日期、长日分页、确认卡在界面里能走通了。**

窗口：2026-10-23 22:18–22:32。基线：`Cornie-036 对话模块前端审计报告` 的批次 A（P-1～P-5）。

| # | Change | Where | Kind | State | What it means for the reader |
|---|---|---|---|---|---|
| C-1 | 默认打开今天，日期条改为升序，箭头按日期先后走且端点禁用 | `ChatPanel.vue`、`ChatDateNav.vue` | Fixed | Done | 进入对话不再停在几个月前，发送不会写进旧日期 |
| C-2 | 首启与空白日先渲染临时消息，空态只在两者都空时出现；发送后重拉日期再刷新历史 | `ChatHistoryPage.vue`、`ChatPanel.vue` | Fixed | Done | 第一次发消息能看见自己的气泡和回复，不再凭空消失 |
| C-3 | 历史按 `hasMore` 串行加载全部分页，加载后停到底部 | `api/chatlog.js`、`ChatHistoryPage.vue` | Fixed | Done | 单日超过 100 条不再截断，打开即最新一条 |
| C-4 | 流式结果落进消息，历史按 `conversationMessageId` 挂确认，确认卡与工具结果改读后端字段 | `ChatPanel.vue`、`ChatHistoryPage.vue`、`ConfirmCard.vue`、`ToolResultPanel.vue`、`api/confirm.js` | Changed | Done | 需要确认的高风险操作能在聊天里看到原因并批准或拒绝 |
| C-5 | 对话模块改用项目内原生按钮，图标按钮补可访问名 | `common/AppButton.vue`、chat 三个组件 | Fixed | Done | 发送、取消、日期箭头可用 Tab 聚焦和键盘触发，禁用真正生效 |

Routine：5 份任务 brief、10 个提交、新增 17 条前端用例（全量 131 例通过）、构建与 eslint/prettier/stylelint 通过。

## 2. What it means

对话模块从“能显示历史”变成“四条主路径都能在界面里走完”：默认今天、首启可见、长日完整、确认可决。

这一轮只修正确性，没有动视觉与阅读体验，所以页面看起来仍与审计截图一致；批次 B 的滚动、排版与输入区、批次 C 的 token 与视觉统一仍未开始。

隔离环境复验记录：日期条为 `10-13, 10-17, 10-22, 今天` 且默认今天；120 条日渲染 120 条并停在底部；首启发送后 `msg-row` 为 2；今日消息下出现 1 张确认卡。截图与测量在 `doc/assets/cornie-037-batch-a/`。

## 3. Still open

- 批次 B：长对话滚动管理、正文换行与阅读层级、日期导航产品化、输入区包装与中文 IME 守卫。
- 批次 B：失败、取消、日期切换竞态仍缺闭环；发送失败只恢复草稿，取消后服务端仍可能落库。
- 批次 C：`--nb-*` token 仍未定义，边框、骨架屏、hover 与全局视觉统一没有动。
- 批次 C：空态文案、字号与对比度、读屏播报仍是审计时的状态。
- 验证边界：本轮只在隔离构建与假模型下复验，真实中文输入法与真实用户数据规模未测。
