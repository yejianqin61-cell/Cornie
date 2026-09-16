# 162-Phase1.2-日记模块全量组件落地

## 1. 任务目标

在 `src/renderer/components/diary/` 创建 8 个日记模块组件。

## 2. 交付物

```
src/renderer/components/diary/
├── DiaryHomePage.vue
├── DiaryCalendarMonth.vue
├── DiaryCard.vue
├── CornieDiaryView.vue
├── UserDiaryEditor.vue
├── OnThisDayCard.vue
├── DiaryEmptyState.vue
├── DiaryRegenerateBtn.vue
└── diary.test.js
```

## 3. 组件职责

| 组件 | 职责 |
|------|------|
| DiaryHomePage | 日记主页：顶部日历月视图 + 选中日显示日记卡片 + 往年今日侧栏 |
| DiaryCalendarMonth | 月视图日历网格，点击选中日期，高亮有日记的日期 |
| DiaryCard | 单日日记卡片：显示用户日记 + Cornie 日记双栏 |
| CornieDiaryView | Cornie 视角日记只读视图 |
| UserDiaryEditor | 用户日记 textarea 编辑 |
| OnThisDayCard | 往年今日单独卡片 |
| DiaryEmptyState | 选中日期无日记时的空态 |
| DiaryRegenerateBtn | 重新生成 Cornie 日记按钮 |

## 4. 后端对接

| 方法 | API |
|------|-----|
| 月列表 | listEntries({ month }) |
| 单日 | getEntry(date) |
| 编辑 | upsertEntry(date, { userText, cornieText }) |
| 重新生成 | regenerateCornie(date) |
| 往年今日 | getOnThisDay(date, limit) |

## 5. Props 约定

- DiaryHomePage: 无 props（内部管理 selectedDate 状态）
- DiaryCalendarMonth: `entries: Array<{date, hasUserText, hasCornieText}>`, `selectedDate: String`
- DiaryCard: `entry: Object`, `date: String`
- CornieDiaryView: `text: String`
- UserDiaryEditor: `text: String`, `date: String`
- OnThisDayCard: `item: Object`
- DiaryEmptyState: 无
- DiaryRegenerateBtn: `date: String`

## 6. 验收

- [ ] 8 组件全部创建
- [ ] 日历可点击切换日期
- [ ] 日记双栏（用户 + Cornie）可展示
- [ ] 用户日记可编辑
- [ ] 往年今日可展示
- [ ] 测试覆盖基本渲染