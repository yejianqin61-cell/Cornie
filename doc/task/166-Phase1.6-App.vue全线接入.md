# 166-Phase1.6-App.vue全线接入

## 1. 任务目标

将 Phase 1 创建的 6 个模块（日记、观察、记忆维基、待办、日程、设置）全部接入 App.vue 侧边栏，实现全模块切换。

## 2. 现状

App.vue 当前只接入了聊天和记账：

```
activeModule: chat → ChatPanel
activeModule: ledger → LedgerHomePage
其他: "即将上线" 占位
```

## 3. 改造内容

将 7 个侧边栏入口全部接入对应模块组件：

| 模块ID | 组件 | 导入路径 |
|--------|------|----------|
| chat | ChatPanel | `./components/chat/ChatPanel.vue` |
| diary | DiaryHomePage | `./components/diary/DiaryHomePage.vue` |
| memory | MemoryWikiHomePage | `./components/memory/MemoryWikiHomePage.vue` |
| observe | ObservationListPage | `./components/observe/ObservationListPage.vue` |
| ledger | LedgerHomePage | `./components/ledger/LedgerHomePage.vue` |
| todo | TodoHomePage | `./components/todo/TodoHomePage.vue` |
| schedule | ScheduleHomePage | `./components/schedule/ScheduleHomePage.vue` |

设置模块通过侧边栏底部入口接入 `SettingsPage`。

## 4. 额外改动

- 侧边栏底部"设置"入口接入 SettingsPage（不再只是一个无功能按钮）
- 状态栏数据无需改动（保持记忆12/观察3/v0.1.0静态展示）

## 5. 验收

- [ ] 7 个模块全部可切换
- [ ] 设置入口可打开设置页
- [ ] 不再有"即将上线"占位符
- [ ] 无报错