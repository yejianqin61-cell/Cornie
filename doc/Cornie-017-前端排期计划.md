# Cornie-017-前端排期计划

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | 前端全量开发排期计划 |
| 文件名称 | Cornie-017-前端排期计划.md |
| 编写日期 | 2026-09-16 |
| 适用对象 | 前端 / 全栈 / Claude Code |
| 关联文档 | Cornie-001、Cornie-015、Cornie-016 |

---

## 2. 桌面框架选型结论

**选定：Electron（已有）**

| 维度 | Electron | Tauri | 结论 |
|------|----------|-------|------|
| 当前状态 | 已配置 `electron/main.cjs` + `preload.cjs` + `server.js` | 零配置 | 无需迁移，直接用 |
| 后端 | Express 运行在 Electron 主进程，端口 5174 | 需改写为 Rust Command | 改造成本巨大 |
| 原生能力 | IPC / 系统托盘 / 窗口管理 / 置顶 | 需 Rust 侧实现 | Electron 已全部就绪 |
| 打包 | electron-builder | tauri-builder | 无需切换 |

后端已深度嵌入 Electron 主进程（`electron/server.js`），迁移到 Tauri 需将 Express → Rust 重写，ROI 为零。维持 Electron。

---

## 3. 现状总览

### 3.1 后端（成熟）

15 个模块全部落地，Express REST API 端口 5174：

```
electron/backend/
├── agent/           # 编排器 + 上下文构造 + 协议信封 + 记忆蒸馏
├── chatlog/         # 聊天记录 CRUD + 按日归档
├── confirm/         # 确认流（执行 / 降级 / 回退）
├── conversation/    # 对话管理
├── diary/           # 日记 CRUD + Cornie 生成
├── ledger/          # 收支 CRUD + 类目 + 工具注册
├── memory-wiki/     # 记忆页面 + 版本 + 回滚 + Topic 索引 + 审计
├── model/deepseek/  # DeepSeek API 客户端
├── observation/     # 观察日志 CRUD + 去重 + 压缩
├── policy/          # 风险等级 + 工具策略
├── schedule/        # 日程 CRUD + 工具注册
├── settings/        # 设置持久化
├── system/          # 系统只读工具
├── todo/            # 待办 CRUD + 工具注册
└── tools/           # 工具网关 + 注册中心
```

### 3.2 前端（进行中）

- 框架：Vue 3 + Vite（端口 5173）
- 组件库：neobrutalism-vue + lucide-vue
- 已完成：22/83 组件（布局壳层 + 5 通用 + 9 聊天 + 6 记账）
- 缺失：日记 8 + 记忆维基 9 + 观察日志 7 + 待办 4 + 日程 4 + 设置 5 + 桌宠 3 + API 层 + 前后端联调

---

## 4. 排期总览

共 6 周，分 4 个阶段：

```
Week 1-2    Phase 1: 通用基建 + 前端 API 层 + 剩余模块组件全量落地
Week 2-3    Phase 2: 前后端联调（P0 核心链路）
Week 3-5    Phase 3: 前后端联调（P1 全模块收口）
Week 5-6    Phase 4: 桌宠 + 打包 + 发布验收
```

---

## 5. Phase 1：组件全量落地 + API 层（Week 1-2）

### 5.1 前端 API 层（Day 1-2）

建立 `src/renderer/api/` 目录，统一封装所有后端接口。

| 文件 | 对应后端模块 | 接口数（估） |
|------|------------|------------|
| `api/client.js` | HTTP 基础客户端（fetch 封装 + 错误处理） | - |
| `api/chat.js` | chatlog + conversation | ~6 |
| `api/diary.js` | diary | ~6 |
| `api/memory-wiki.js` | memory-wiki | ~15 |
| `api/observation.js` | observation | ~5 |
| `api/ledger.js` | ledger | ~6 |
| `api/todo.js` | todo | ~5 |
| `api/schedule.js` | schedule | ~5 |
| `api/settings.js` | settings | ~4 |
| `api/confirm.js` | confirm | ~3 |
| `api/model.js` | model/deepseek | ~3 |

### 5.2 日记模块组件（Day 2-4）

目录：`src/renderer/components/diary/`

| # | 组件 | 依赖 |
|---|------|------|
| D01 | DiaryHomePage | PageHeader + DiaryCalendarMonth + DiaryCard |
| D02 | DiaryCard | 无 |
| D03 | CornieDiaryView | 无 |
| D04 | UserDiaryEditor | 无 |
| D05 | OnThisDayCard | 无 |
| D06 | DiaryCalendarMonth | 无 |
| D07 | DiaryEmptyState | EmptyState |
| D08 | DiaryRegenerateBtn | Button（neobrutalism-vue） |

### 5.3 观察日志模块组件（Day 4-6）

目录：`src/renderer/components/observe/`

| # | 组件 | 依赖 |
|---|------|------|
| O01 | ObservationListPage | PageHeader + ObservationCard |
| O02 | ObservationDetailPage | PageHeader |
| O03 | ObservationForm | Button |
| O04 | ObservationCard | LedgerCategoryTag（复用） |
| O05 | ObservationDeleteConfirm | ConfirmDialog |
| O06 | ObservationLinkedMemory | 无 |
| O07 | ObservationEmptyState | EmptyState |

### 5.4 记忆维基模块组件（Day 6-8）

目录：`src/renderer/components/memory/`

| # | 组件 | 依赖 |
|---|------|------|
| M01 | MemoryWikiHomePage | PageHeader + MemoryWikiTree + MemoryWikiDetail |
| M02 | MemoryWikiTree | 无 |
| M03 | MemoryWikiDetail | MemoryWikiSourceRef + MemoryWikiRelatedLinks + TopicChip |
| M04 | MemoryWikiSourceRef | 无 |
| M05 | MemoryWikiRelatedLinks | 无 |
| M06 | TopicChip | 无 |
| M07 | MemoryWikiCompare | 无 |
| M08 | MemoryWikiEditor | 无 |
| M09 | MemoryWikiEmptyState | EmptyState |

### 5.5 待办 + 日程 + 设置模块组件（Day 8-10）

| 模块 | 组件数 | 目录 |
|------|--------|------|
| 待办 | 4 | `components/todo/` |
| 日程 | 4 | `components/schedule/` |
| 设置 | 5 | `components/settings/` |

### 5.6 App.vue 全线接入（Day 10）

所有模块通过侧边栏切换，全部可访问。

---

## 6. Phase 2：P0 核心链路联调（Week 2-3）

> 目标：聊天 → 对话 → Cornie 日记生成 → 往年今日 闭环可走通

### 6.1 聊天 + 对话链路（Day 1-2）

| 联调项 | 前端 | 后端 |
|--------|------|------|
| 发送消息 | ChatPanel.send() | POST `/api/conversation/message` |
| 获取历史 | ChatHistoryPage + ChatDateNav | GET `/api/chatlog/days` |
| 消息流 | ChatPanel | SSE 或轮询 |
| 记忆引用提示 | MemoryHint | 对话响应中的 memory refs |
| 工具结果展示 | ToolResultPanel | 对话响应中的 tool_results |
| 确认卡片 | ConfirmCard | 对话响应中的 confirm_required |

### 6.2 日记链路（Day 3-4）

| 联调项 | 前端 | 后端 |
|--------|------|------|
| 日记列表 | DiaryHomePage + DiaryCalendarMonth | GET `/api/diary/list` |
| 用户日记编辑 | UserDiaryEditor | PUT `/api/diary/:date/user` |
| Cornie 日记展示 | CornieDiaryView | GET `/api/diary/:date/cornie` |
| Cornie 日记重新生成 | DiaryRegenerateBtn | POST `/api/diary/:date/regenerate` |
| 往年今日 | OnThisDayCard | GET `/api/diary/on-this-day` |

### 6.3 记账链路（Day 5）

| 联调项 | 前端 | 后端 |
|--------|------|------|
| 列表 + 筛选 | LedgerHomePage | GET `/api/ledger/transactions` |
| 新增 | LedgerTransactionForm | POST `/api/ledger/transactions` |
| 编辑 | LedgerTransactionForm | PUT `/api/ledger/transactions/:id` |
| 删除 | ConfirmDialog | DELETE `/api/ledger/transactions/:id` |

---

## 7. Phase 3：P1 全模块收口（Week 3-5）

### 7.1 观察日志链路（Day 1-3）

| 联调项 | 前端 | 后端 |
|--------|------|------|
| 列表 | ObservationListPage | GET `/api/observation/list` |
| 详情 | ObservationDetailPage | GET `/api/observation/:id` |
| 新建/编辑 | ObservationForm | POST/PUT `/api/observation` |
| 删除 | ObservationDeleteConfirm | DELETE `/api/observation/:id` |
| 关联记忆 | ObservationLinkedMemory | GET `/api/observation/:id/memory-links` |

### 7.2 记忆维基链路（Day 3-6）

| 联调项 | 前端 | 后端 |
|--------|------|------|
| 树形目录 | MemoryWikiTree | GET `/api/memory-wiki/pages` |
| 页面详情 | MemoryWikiDetail | GET `/api/memory-wiki/pages/:id` |
| 来源引用 | MemoryWikiSourceRef | GET `/api/memory-wiki/pages/:id/sources` |
| 关联页面 | MemoryWikiRelatedLinks | GET `/api/memory-wiki/pages/:id/related` |
| 编辑页面 | MemoryWikiEditor | PUT `/api/memory-wiki/pages/:id` |
| 版本比较 | MemoryWikiCompare | GET `/api/memory-wiki/pages/:id/versions` |
| Topic 筛选 | TopicChip | GET `/api/memory-wiki/topics` |
| 治理面板 | PageHeader actions | GET `/api/memory-wiki/governance/*` |

### 7.3 待办 + 日程链路（Day 7-8）

| 联调项 | 前端 | 后端 |
|--------|------|------|
| 待办 CRUD | TodoHomePage | `/api/todo/*` |
| 日程 CRUD | ScheduleHomePage | `/api/schedule/*` |

### 7.4 设置链路（Day 9-10）

| 联调项 | 前端 | 后端 |
|--------|------|------|
| DeepSeek 配置 | DeepseekConfig | GET/PUT `/api/settings/deepseek` |
| 通用设置 | SettingsSection | GET/PUT `/api/settings/general` |
| 数据备份 | DataBackupSection | POST `/api/settings/export` |

---

## 8. Phase 4：桌宠 + 打包 + 发布验收（Week 5-6）

### 8.1 桌宠组件（Day 1-3）

目录：`src/renderer/components/pet/`

| # | 组件 | 职责 |
|---|------|------|
| P01 | CorniePet | 透明窗口 + Canvas 动画（呼吸/眨眼/尾巴）+ 点击打开主窗口 |
| P02 | CornieBubble | 气泡提示：喝水提醒 / 往年今日 / 日记生成完成 |
| P03 | PetSettings | 大小 / 位置 / 铃铛音量 |

### 8.2 Electron 打包（Day 3-4）

- `electron-builder` 配置
- Windows 安装包（NSIS）
- 图标 / 签名
- 自动更新基础配置

### 8.3 全局验收（Day 5-6）

- 全模块点击遍历
- 空态 / 加载态 / 错误态全覆盖
- 键盘可达性
- 窗口最小化 / 最大化 / 关闭
- 开机自启
- 数据持久化验证

---

## 9. 关键里程碑

| 日期 | 里程碑 | 验收标准 |
|------|--------|---------|
| D+3 | API 层完成 | 10 个 api 模块，统一错误处理 |
| D+5 | 日记模块 UI 完成 | 8 组件，日历 + 双视角日记 + 往年今日 |
| D+7 | 观察日志 UI 完成 | 7 组件，含关联记忆入口 |
| D+9 | 记忆维基 UI 完成 | 9 组件，树形导航 + 详情 + 版本对比 |
| D+10 | 全模块组件落地 | 83/83 组件，侧边栏全可切换 |
| D+16 | P0 核心闭环联调 | 聊天→对话→日记→往年今日→记账 全链路可走 |
| D+23 | 观察日志联调 | 列表→详情→编辑→删除→关联记忆 |
| D+26 | 记忆维基联调 | 树→详情→来源→关联→版本对比→治理 |
| D+30 | 全模块联调完成 | 所有前后端 HTTP 接口对通 |
| D+36 | 桌宠 + 打包 | CorniePet 透明窗口 + Windows 安装包 |
| D+40 | 发布验收 | 全链路无阻断 |

---

## 10. 风险与应对

| 风险 | 概率 | 应对 |
|------|------|------|
| 后端 API 路径与文档不一致 | 中 | Phase 1 先读 `electron/server.js` 和 routes 文件确认真实路径 |
| 后端 SSE / 流式接口前端适配 | 中 | ChatPanel 先做轮询兜底，再补 SSE |
| Electron IPC 与 HTTP API 重复 | 低 | 统一走 HTTP API（`localhost:5174`），IPC 仅用于窗口控制 |
| 旧 React 前端残留干扰 | 低 | 旧前端已覆盖为 Vue，`dist/` 为构建产物，无视即可 |

---

## 11. 前端目录最终态

```
src/renderer/
├── api/                              ← Phase 1 新建
│   ├── client.js
│   ├── chat.js
│   ├── diary.js
│   ├── ledger.js
│   ├── memory-wiki.js
│   ├── observation.js
│   ├── todo.js
│   ├── schedule.js
│   ├── settings.js
│   ├── confirm.js
│   └── model.js
├── components/
│   ├── layout/          (4) DONE
│   │   ├── CornieLayout.vue
│   │   ├── CornieTopBar.vue
│   │   ├── CornieSidebarItem.vue
│   │   └── CornieStatusBar.vue
│   ├── common/          (5) DONE
│   │   ├── EmptyState.vue
│   │   ├── LoadingState.vue
│   │   ├── ErrorState.vue
│   │   ├── PageHeader.vue
│   │   └── ConfirmDialog.vue
│   ├── chat/            (9) DONE
│   ├── ledger/          (6) DONE
│   ├── diary/           (8) TODO
│   ├── memory/          (9) TODO
│   ├── observe/         (7) TODO
│   ├── todo/            (4) TODO
│   ├── schedule/        (4) TODO
│   ├── settings/        (5) TODO
│   └── pet/             (3) TODO
├── styles/
│   └── main.css
├── App.vue
└── main.js
```