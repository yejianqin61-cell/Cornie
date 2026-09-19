# Cornie-016-组件库清单

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | 组件库清单 |
| 文件名称 | Cornie-016-组件库清单.md |
| 编写日期 | 2026-09-16 |
| 适用对象 | 前端 / Claude Code |
| 关联文档 | Cornie-001、Cornie-015、.agent |

## 2. 使用规则

- **开发前先查本清单**，确认组件已存在则直接复用，禁止重复造轮子。
- **neobrutalism-vue 能覆盖的原语**一律用原语，不自己写 Button/Card/Badge/Input 等。
- **所有图标从 `@lucide/vue` 取**，禁止 emoji，无对应图标则取最接近的 lucide 图标。
- **禁止功能说明性文案**，卡片/列表项只保留图标 + 标题 + badge。

---

## 3. 基础原语（neobrutalism-vue 直接复用）

以下组件**不创建项目自定义版本**，直接从 `neobrutalism-vue` import。

| 组件 | import |
|------|--------|
| Button | `import { Button } from 'neobrutalism-vue'` |
| Badge | `import { Badge } from 'neobrutalism-vue'` |
| Input | `import { Input } from 'neobrutalism-vue'` |
| Textarea | `import { Textarea } from 'neobrutalism-vue'` |
| Select | `import { Select } from 'neobrutalism-vue'` |
| Checkbox | `import { Checkbox } from 'neobrutalism-vue'` |
| Toggle / Switch | `import { Switch } from 'neobrutalism-vue'` |
| Card | `import { Card } from 'neobrutalism-vue'` |
| Dialog / Modal | `import { Dialog } from 'neobrutalism-vue'` |
| Toast | `import { Toast } from 'neobrutalism-vue'` |
| Tooltip | `import { Tooltip } from 'neobrutalism-vue'` |
| Dropdown Menu | `import { DropdownMenu } from 'neobrutalism-vue'` |
| Tabs | `import { Tabs } from 'neobrutalism-vue'` |
| Progress | `import { Progress } from 'neobrutalism-vue'` |
| RadioGroup | `import { RadioGroup } from 'neobrutalism-vue'` |
| Separator | `import { Separator } from 'neobrutalism-vue'` |
| Label | `import { Label } from 'neobrutalism-vue'` |

---

## 4. 布局壳层组件

组件目录：`src/renderer/components/layout/`

| # | 组件名 | 文件 | 状态 | 职责 |
|---|--------|------|------|------|
| L01 | CornieLayout | `CornieLayout.vue` | DONE | 应用全局骨架：顶栏 + 侧栏 + 内容区 + 底栏 |
| L02 | CornieTopBar | `CornieTopBar.vue` | DONE | 美团黄标题栏：头像 + "CORNIE" + 窗口控制按钮 |
| L03 | CornieSidebarItem | `CornieSidebarItem.vue` | DONE | 侧栏导航项：lucide 图标 + label + 选中态 |
| L04 | CornieStatusBar | `CornieStatusBar.vue` | DONE | 底部状态栏：在线指示 + slot 数据位 |

**Props 约定：**

| 组件 | Props |
|------|-------|
| CornieLayout | slots: `sidebar` / `default` / `status` |
| CornieTopBar | 无 |
| CornieSidebarItem | `icon: String`, `label: String`, `active?: Boolean` |
| CornieStatusBar | slot: `default` |

---

## 5. 聊天模块组件

组件目录：`src/renderer/components/chat/`

| # | 组件名 | 文件 | 状态 | 职责 |
|---|--------|------|------|------|
| C01 | ChatPanel | `ChatPanel.vue` | DONE | 主聊天面板：消息列表 + 输入区 + 发送 |
| C02 | ChatHistoryPage | `ChatHistoryPage.vue` | TODO | 历史聊天工作台：日期导航 + 消息浏览 + 摘要 |
| C03 | AskBackBubble | `AskBackBubble.vue` | TODO | Cornie 反问气泡：轻量追问提示 |
| C04 | ConfirmCard | `ConfirmCard.vue` | TODO | 确认卡片：工具执行前确认 |
| C05 | ToolResultPanel | `ToolResultPanel.vue` | TODO | 工具结果面板：只读结果 / 写入成功 / 写入失败 |
| C06 | MemoryHint | `MemoryHint.vue` | TODO | 记忆引用轻提示：本轮引用了哪些长期记忆 |
| C07 | ChatDateNav | `ChatDateNav.vue` | TODO | 聊天日期导航：月份 + 日期列表 |
| C08 | ChatDaySummary | `ChatDaySummary.vue` | TODO | 单日对话摘要卡 |
| C09 | ChatEmptyState | `ChatEmptyState.vue` | TODO | 当天无消息空态 |

**Props 约定：**

| 组件 | Props |
|------|-------|
| ChatPanel | 无（内部 self-contained） |
| ChatHistoryPage | `messages: Array`, `currentDate: String` |
| AskBackBubble | `text: String`, `onReply: Function` |
| ConfirmCard | `title: String`, `detail: String`, `onConfirm: Function`, `onCancel: Function` |
| ToolResultPanel | `type: 'readonly' \| 'success' \| 'failure'`, `data: Object`, `onRetry?: Function` |
| MemoryHint | `memories: Array<{title, snippet, source}>` |
| ChatDateNav | `dates: Array<String>`, `currentDate: String`, `onSelect: Function` |
| ChatDaySummary | `date: String`, `summary: String`, `messageCount: Number` |

---

## 6. 日记模块组件

组件目录：`src/renderer/components/diary/`

| # | 组件名 | 文件 | 状态 | 职责 |
|---|--------|------|------|------|
| D01 | DiaryHomePage | `DiaryHomePage.vue` | TODO | 日记首页：日历视图 + 日记卡片列表 |
| D02 | DiaryCard | `DiaryCard.vue` | TODO | 日记卡片：用户日记 + Cornie 日记双栏 |
| D03 | CornieDiaryView | `CornieDiaryView.vue` | TODO | Cornie 视角日记阅读视图 |
| D04 | UserDiaryEditor | `UserDiaryEditor.vue` | TODO | 用户日记编辑器 |
| D05 | OnThisDayCard | `OnThisDayCard.vue` | TODO | 往年今日卡片：历史日记展示 |
| D06 | DiaryCalendarMonth | `DiaryCalendarMonth.vue` | TODO | 月历组件：标记有日记的日期 |
| D07 | DiaryEmptyState | `DiaryEmptyState.vue` | TODO | 无日记空态 |
| D08 | DiaryRegenerateBtn | `DiaryRegenerateBtn.vue` | TODO | Cornie 日记重新生成按钮 |

**Props 约定：**

| 组件 | Props |
|------|-------|
| DiaryCard | `userDiary?: String`, `cornieDiary: String`, `date: String` |
| CornieDiaryView | `content: String`, `date: String`, `onEdit: Function` |
| UserDiaryEditor | `initialContent?: String`, `onSave: Function` |
| OnThisDayCard | `diary: Object`, `year: Number`, `onClick: Function` |
| DiaryCalendarMonth | `year: Number`, `month: Number`, `diaryDates: Array`, `onDateClick: Function` |

---

## 7. 记忆维基模块组件

组件目录：`src/renderer/components/memory/`

| # | 组件名 | 文件 | 状态 | 职责 |
|---|--------|------|------|------|
| M01 | MemoryWikiHomePage | `MemoryWikiHomePage.vue` | TODO | 记忆维基首页：树形导航 + 详情面板 |
| M02 | MemoryWikiTree | `MemoryWikiTree.vue` | TODO | 记忆页面树形目录 |
| M03 | MemoryWikiDetail | `MemoryWikiDetail.vue` | TODO | 页面详情：正文 + 来源引用 + 关联页面 |
| M04 | MemoryWikiSourceRef | `MemoryWikiSourceRef.vue` | TODO | 来源引用区：该记忆从哪些对话/观察/日记提取 |
| M05 | MemoryWikiRelatedLinks | `MemoryWikiRelatedLinks.vue` | TODO | 关联页面阅读区 |
| M06 | TopicChip | `TopicChip.vue` | TODO | Topic 标签：点击跳转对应 Topic 页 |
| M07 | MemoryWikiCompare | `MemoryWikiCompare.vue` | TODO | 版本比较视图 |
| M08 | MemoryWikiEditor | `MemoryWikiEditor.vue` | TODO | 记忆页面编辑器（Markdown） |
| M09 | MemoryWikiEmptyState | `MemoryWikiEmptyState.vue` | TODO | 无记忆空态 |

**Props 约定：**

| 组件 | Props |
|------|-------|
| MemoryWikiTree | `pages: Array`, `currentPage: String`, `onSelect: Function` |
| MemoryWikiDetail | `page: Object`, `sourceRefs: Array`, `relatedPages: Array` |
| MemoryWikiSourceRef | `sources: Array<{type, title, snippet, url}>` |
| MemoryWikiRelatedLinks | `pages: Array<{id, title, topic}>` |
| TopicChip | `topic: String`, `active?: Boolean`, `onClick: Function` |
| MemoryWikiCompare | `leftVersion: Object`, `rightVersion: Object` |

---

## 8. 观察日志模块组件

组件目录：`src/renderer/components/observe/`

| # | 组件名 | 文件 | 状态 | 职责 |
|---|--------|------|------|------|
| O01 | ObservationListPage | `ObservationListPage.vue` | TODO | 观察日志列表：按日分组 |
| O02 | ObservationDetailPage | `ObservationDetailPage.vue` | TODO | 观察日志详情 |
| O03 | ObservationForm | `ObservationForm.vue` | TODO | 新建 / 编辑表单 |
| O04 | ObservationCard | `ObservationCard.vue` | TODO | 单条观察日志卡片 |
| O05 | ObservationDeleteConfirm | `ObservationDeleteConfirm.vue` | TODO | 删除确认对话框 |
| O06 | ObservationLinkedMemory | `ObservationLinkedMemory.vue` | TODO | 关联记忆入口：该观察被哪些记忆引用 |
| O07 | ObservationEmptyState | `ObservationEmptyState.vue` | TODO | 无观察日志空态 |

**Props 约定：**

| 组件 | Props |
|------|-------|
| ObservationCard | `observation: Object`, `onClick: Function`, `onDelete: Function` |
| ObservationForm | `initialData?: Object`, `onSave: Function`, `onCancel: Function` |
| ObservationLinkedMemory | `memoryLinks: Array<{pageId, pageTitle}>` |

---

## 9. 收支模块组件

组件目录：`src/renderer/components/ledger/`

| # | 组件名 | 文件 | 状态 | 职责 |
|---|--------|------|------|------|
| LE01 | LedgerHomePage | `LedgerHomePage.vue` | TODO | 收支首页：列表 + 统计 + 筛选 |
| LE02 | LedgerTransactionList | `LedgerTransactionList.vue` | TODO | 收支记录列表 |
| LE03 | LedgerTransactionForm | `LedgerTransactionForm.vue` | TODO | 收支记录表单 |
| LE04 | LedgerCategoryTag | `LedgerCategoryTag.vue` | TODO | 分类标签 |
| LE05 | LedgerMonthSummary | `LedgerMonthSummary.vue` | TODO | 月度收支汇总 |
| LE06 | LedgerEmptyState | `LedgerEmptyState.vue` | TODO | 无收支记录空态 |

**Props 约定：**

| 组件 | Props |
|------|-------|
| LedgerTransactionList | `transactions: Array`, `onEdit: Function`, `onDelete: Function` |
| LedgerTransactionForm | `initialData?: Object`, `categories: Array`, `onSave: Function` |
| LedgerCategoryTag | `category: String`, `color?: String` |
| LedgerMonthSummary | `month: String`, `income: Number`, `expense: Number` |

---

## 10. 待办模块组件

组件目录：`src/renderer/components/todo/`

| # | 组件名 | 文件 | 状态 | 职责 |
|---|--------|------|------|------|
| T01 | TodoHomePage | `TodoHomePage.vue` | TODO | 待办首页：列表 + 添加 + 完成 |
| T02 | TodoItem | `TodoItem.vue` | TODO | 单条待办项：勾选 / 编辑 / 删除 |
| T03 | TodoForm | `TodoForm.vue` | TODO | 新建 / 编辑待办表单 |
| T04 | TodoEmptyState | `TodoEmptyState.vue` | TODO | 无待办空态 |

**Props 约定：**

| 组件 | Props |
|------|-------|
| TodoItem | `todo: Object`, `onToggle: Function`, `onEdit: Function`, `onDelete: Function` |
| TodoForm | `initialData?: Object`, `onSave: Function`, `onCancel: Function` |

---

## 11. 日程模块组件

组件目录：`src/renderer/components/schedule/`

| # | 组件名 | 文件 | 状态 | 职责 |
|---|--------|------|------|------|
| S01 | ScheduleHomePage | `ScheduleHomePage.vue` | TODO | 日程首页：日历视图 + 待办日程列表 |
| S02 | ScheduleItem | `ScheduleItem.vue` | TODO | 单条日程项 |
| S03 | ScheduleForm | `ScheduleForm.vue` | TODO | 新建 / 编辑日程表单 |
| S04 | ScheduleEmptyState | `ScheduleEmptyState.vue` | TODO | 无日程空态 |

**Props 约定：**

| 组件 | Props |
|------|-------|
| ScheduleItem | `schedule: Object`, `onEdit: Function`, `onDelete: Function` |
| ScheduleForm | `initialData?: Object`, `startDate?: String`, `onSave: Function` |

---

## 12. 设置模块组件

组件目录：`src/renderer/components/settings/`

| # | 组件名 | 文件 | 状态 | 职责 |
|---|--------|------|------|------|
| ST01 | SettingsPage | `SettingsPage.vue` | TODO | 设置首页：分区导航 + 内容面板 |
| ST02 | SettingsSection | `SettingsSection.vue` | TODO | 单个设置区块：标题 + 描述 + 控件 |
| ST03 | DeepseekConfig | `DeepseekConfig.vue` | TODO | DeepSeek 配置页：API Key + 模型选择 |
| ST04 | ModelStatusCard | `ModelStatusCard.vue` | TODO | 模型状态卡片：可用 / 下载中 / 离线 |
| ST05 | DataBackupSection | `DataBackupSection.vue` | TODO | 数据备份与恢复区块 |

**Props 约定：**

| 组件 | Props |
|------|-------|
| SettingsSection | `title: String`, `slot: default` |
| DeepseekConfig | `config: Object`, `onSave: Function` |
| ModelStatusCard | `model: Object` |

---

## 13. 桌宠组件

组件目录：`src/renderer/components/pet/`

| # | 组件名 | 文件 | 状态 | 职责 |
|---|--------|------|------|------|
| P01 | CorniePet | `CorniePet.vue` | TODO | 桌面透明窗口：Cornie 动画 + 点击交互 |
| P02 | CornieBubble | `CornieBubble.vue` | TODO | Cornie 气泡：短文本提示 |
| P03 | PetSettings | `PetSettings.vue` | TODO | 桌宠设置：大小 / 位置 / 铃铛音量 |

**Props 约定：**

| 组件 | Props |
|------|-------|
| CorniePet | `onClick: Function`, `animation: String` |
| CornieBubble | `text: String`, `duration?: Number`, `onDismiss: Function` |

---

## 14. 跨模块通用组件

组件目录：`src/renderer/components/common/`

| # | 组件名 | 文件 | 状态 | 职责 |
|---|--------|------|------|------|
| U01 | EmptyState | `EmptyState.vue` | TODO | 通用空态：lucide 图标 + 一句话提示 |
| U02 | LoadingState | `LoadingState.vue` | TODO | 通用加载态 |
| U03 | ErrorState | `ErrorState.vue` | TODO | 通用错误态：消息 + 重试按钮 |
| U04 | PageHeader | `PageHeader.vue` | TODO | 页面标题头：图标 + 标题 + 右侧操作 slot |
| U05 | SearchBar | `SearchBar.vue` | TODO | 通用搜索栏 |
| U06 | DateRangePicker | `DateRangePicker.vue` | TODO | 日期范围选择器 |
| U07 | ConfirmDialog | `ConfirmDialog.vue` | TODO | 通用确认对话框：标题 + 正文 + 确认/取消 |

**Props 约定：**

| 组件 | Props |
|------|-------|
| EmptyState | `icon: Component`, `text: String` |
| LoadingState | `text?: String` |
| ErrorState | `message: String`, `onRetry?: Function` |
| PageHeader | `icon: Component`, `title: String`, slot: `actions` |
| SearchBar | `modelValue: String`, `placeholder?: String` |
| ConfirmDialog | `open: Boolean`, `title: String`, `message: String`, `onConfirm: Function`, `onCancel: Function` |

---

## 15. 状态总览

| 模块 | 总数 | DONE | TODO |
|------|------|------|------|
| 基础原语（neobrutalism-vue） | 17 | 17 | 0 |
| 布局壳层 | 4 | 4 | 0 |
| 聊天模块 | 9 | 1 | 8 |
| 日记模块 | 8 | 0 | 8 |
| 记忆维基模块 | 9 | 0 | 9 |
| 观察日志模块 | 7 | 0 | 7 |
| 收支模块 | 6 | 0 | 6 |
| 待办模块 | 4 | 0 | 4 |
| 日程模块 | 4 | 0 | 4 |
| 设置模块 | 5 | 0 | 5 |
| 桌宠模块 | 3 | 0 | 3 |
| 跨模块通用 | 7 | 0 | 7 |
| **合计** | **83** | **22** | **61** |

---

## 16. 优先开发顺序

| 优先级 | 批次 | 组件 | 理由 |
|--------|------|------|------|
| P0 | U | EmptyState / LoadingState / ErrorState / PageHeader | 所有页面都需要 |
| P0 | U | ConfirmDialog | 全模块共用删除/确认流 |
| P1 | C | ChatHistoryPage / ChatDateNav / ChatDaySummary | 聊天是核心入口，从"能看"升级到"正式工作台" |
| P1 | C | ConfirmCard / ToolResultPanel / MemoryHint | 聊天透明提示层，核心交互闭环 |
| P1 | D | 日记全系 | 与聊天强关联，核心闭环 |
| P1 | O | 观察日志全系 | 与聊天/记忆联动，P0 缺口 |
| P1 | M | 记忆维基全系 | 知识网络核心 |
| P2 | LE / T / S | 收支/待办/日程全系 | 已落地但需统一 UI 语言 |
| P2 | ST | 设置全系 | App 壳完善 |
| P3 | P | 桌宠全系 | 独立窗口，最后联调 |