# 168-Phase2.2-日记链路联调

## 1. 任务目标

将日记模块与后端 API 完整打通，覆盖 loading/empty/error 三态，实现日记 CRUD 和往年今日。

## 2. 现状审计

DiaryHomePage 已在 Phase 1.2 完成，但缺少 loading/error 态处理和实际 UI 反馈。

## 3. 改造内容

### 3.1 DiaryHomePage.vue

| 功能 | API | 当前状态 | 需补充 |
|------|-----|---------|--------|
| 日记列表 | `listEntries(month)` | 直接渲染 | loading 态、error 态 |
| 用户日记编辑 | `saveUserDiary(date, text)` | 直接调用 | saving 反馈 |
| Cornie 日记查看 | `getCornieDiary(date)` | 未接入 | 接入 API |
| Cornie 日记重新生成 | `regenerateCornieDiary(date)` | 未接入 | 接入 API |
| 往年今日 | `getOnThisDay(month, day)` | 未接入 | 接入 API |

### 3.2 UserDiaryEditor.vue

- 添加 `saving` 状态，保存时显示 loading
- 添加 `saveError` 错误提示

### 3.3 CornieDiaryView.vue

- 添加 `loading` skeleton + `error` 重试

### 3.4 OnThisDayCard.vue

- 接入 `getOnThisDay` API，显示往年今日的日记片段

## 4. 验收标准

- [ ] 月历切换月份时加载对应月日记列表（loading/error/empty）
- [ ] 编辑日记保存后刷新列表，显示 saving 状态
- [ ] 查看 Cornie 日记时显示 loading 和内容
- [ ] 重新生成 Cornie 日记后刷新显示
- [ ] 往年今日卡片显示往年记录
- [ ] 全部状态有对应测试覆盖