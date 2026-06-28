# task-002 App 壳层与全局导航重构

## 目标

将当前"系统导航面板"改为"面向普通人的陪伴型导航"，重构 `App.vue` 的壳层布局和一级导航。

## 背景

当前 `App.vue` 的 `navPanel` 使用了 `brandBlock` + `navList` 结构，整体视觉偏后台侧边栏。设计文档要求一级导航固定 7 项，以「聊天」为绝对主入口，导航文案口语化，视觉上温和、有陪伴感。

## 关联设计文档

- `Cornie-0628-前端能力边界与人类可见接口设计.md` §7.1, §12.1
- `Cornie-0628-前端页面清单与树状入口图.md` §4, §7
- `Cornie-0628-前端视觉语言设计备忘.md` §5-8

## 影响文件

| 文件 | 操作 |
|---|---|
| `src/renderer/App.vue` | 重写壳层模板、导航、mode 切换逻辑 |

## 变更规格

### 导航模式重构

当前 `mode` 枚举：`diary | ledger | todo | schedule | memory-wiki | history | cornie-composer`

改为 7 个一级导航：

```js
const sections = [
  { id: 'chat',        label: '聊天',       hint: '和铃湾说说话',         icon: '💬' },
  { id: 'diary',       label: '日记',       hint: '写下今天的心情',       icon: '📔' },
  { id: 'ledger',      label: '收支',       hint: '轻松记一笔',           icon: '💰' },
  { id: 'todo',        label: '待办',       hint: '今天要做什么',         icon: '✅' },
  { id: 'schedule',    label: '日程',       hint: '接下来的安排',         icon: '📅' },
  { id: 'observe-memory', label: '观察与记忆', hint: '想记住的小事',     icon: '🌟' },
  { id: 'settings',    label: '设置',       hint: '铃湾的连接和偏好',     icon: '⚙️' },
]
```

### 默认入口

- `mode` 默认值改为 `'chat'`（当前是 `'diary'`）
- 聊天必须是绝对主入口

### 导航面板样式

- 去掉 `background: linear-gradient(...)` 玻璃效果
- 改为浅色背景（`var(--surface)`）
- 选中项背景从 `rgba(125,211,252,.14)` → `var(--accent)` 的极浅版本（如 `rgba(232,133,106,.08)`）
- 去掉大 logoMark（C 字母方块），改为温和文字品牌
- 导航按钮间距拉大，留白充足
- 去掉 `.brandHint` 的技术描述

### 壳层布局

- 保持 `grid-template-columns: 280px minmax(0, 1fr)` 两栏
- 去掉当前 `.appShell.guided` 的 radial-gradient
- 整体背景使用 `var(--bg)`

### 顶部栏调整

- `topBar` 去掉 `background: rgba(255,255,255,.05)` 
- 改为 `var(--surface)` + `var(--border)`
- 去掉 modelSummary 技术状态条（移到设置页）

### 路由组件映射

```js
// mode → 组件
'chat'           → 新 ChatHome.vue（task-003）
'diary'          → 新 DiaryHome.vue（task-005）
'ledger'         → 新 LedgerHome.vue（task-009）
'todo'           → 新 TodoHome.vue（task-010）
'schedule'       → 新 ScheduleHome.vue（task-011）
'observe-memory' → 新 ObserveMemoryHome.vue（task-006）
'settings'       → 新 SettingsHome.vue（task-012）
```

## 验收条件

1. 左侧导航显示 7 项，文案口语化
2. 默认打开聊天页
3. 导航切换正常，顶部标题随 mode 变化
4. 整体视觉不是后台侧边栏风格
5. 去掉玻璃拟态效果
6. 删除 `cornie-composer` 和 `history`、`memory-wiki` 作为独立一级导航
7. DeepSeek 引导遮罩 (`guideOverlay`) 逻辑保留但移到聊天首页或设置页

## 依赖

- task-001（全局样式变量已就绪）
