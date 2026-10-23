# Cornie-038 批次 B 施工收口简报

## 1. Headline

**本轮：6 项变更，全部完成；对话页从组件堆叠变成可读、可导航、可恢复的工作台。**

窗口：2026-10-23 22:59–23:15。基线：`Cornie-036 对话模块前端审计报告` 的批次 B（P-6～P-11）。

| # | Change | Where | Kind | State | What it means for the reader |
|---|---|---|---|---|---|
| C-1 | 定义 `--nb-*` token，聊天页改为带边框与阴影的白卡片 | `styles/main.css`、chat 样式 | Fixed | Done | 日期分隔线、骨架屏、hover 与气泡配色不再失效，页面像一个整块工作台 |
| C-2 | 新增消息正文渲染：段落、换行、代码块、列表、粗体 | `MessageBody.vue`、`MessageRow.vue` | Fixed | Done | 模型回复的结构不再被压成一段流水文字 |
| C-3 | 输入区恢复边框与聚焦态，自动增高、字数提示、Enter/Shift+Enter、IME 守卫 | `ChatPanel.vue` | Changed | Done | 中文选词回车不再误发送，发送中也能继续写 |
| C-4 | 日期标签改为今天/昨天/M月D日/带年份，增加月份筛选与回到今天，选中项滚入视野 | `ChatDateNav.vue`、`ChatPanel.vue`、`api/chatlog.js` | Changed | Done | 能看懂当前读的是哪一天，也能按月和回今天浏览 |
| C-5 | 滚动跟随新消息、上滚暂停、回到最新、按日期记忆位置 | `ChatHistoryPage.vue` | Changed | Done | 长对话不再停在最旧一条，发送后总是落在最新回复 |
| C-6 | 失败气泡可重试、取消有解释、刷新失败不误报、切日期不串台、流必须收到 done | `client.js`、`ChatPanel.vue`、`ChatHistoryPage.vue`、`MessageRow.vue` | Fixed | Done | 失败与取消从“静默消失”变成可理解、可恢复的状态 |

Routine：6 份任务 brief、15 个提交、新增 28 条用例（全量 159 例通过）、构建与 eslint/prettier/stylelint 通过。

## 2. What it means

这一轮补的是“读”和“改”的能力：视觉语言先立住，正文、日期、滚动、输入四条线各自可解释。

运行时复验（重新构建后，在隔离数据库与假模型下跑截图脚本）：token 7 项全部有值；日期条为 `10月13日/10月17日/昨天/今天` 且默认今天；120 条日停在底部；含 4 处换行与列表的回复渲染成 7 行；发送后 `atBottom` 为真；今日消息下确认卡可见。截图与测量在 `doc/assets/cornie-038-batch-b/`。

## 3. Still open

- 空态、错误态仍未复用 `ErrorState`/`Skeleton`，流式与错误仍无 `aria-live`，对比度与字号只做了聊天页的一部分。
- `MemoryHint`、`ChatDaySummary`、`AskBackBubble` 仍是死代码；分页、搜索、导出、确认列表等后端能力仍有未接入口。
- 聊天测试尚未纳入全量门禁，`EmptyState` 的 icon prop 仍产生 Vue 警告。
- 状态栏假数据、顶栏无事件的窗口按钮、逐字符重渲染与排序决胜仍未处理。
- 真机中文输入法、读屏播报、125%/150% 缩放与真实数据规模仍未验证。
