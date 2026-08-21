# R-05 记忆 Wiki-列表册子化（Album-Style Browsing）

## 背景

Cornie-023 §3.2 M3：`MemoryPageList.vue:102` 一次拉全量（api 已支持 limit/offset 却不用）；无分页/类型 Tab/索引；9 种普通类型全并入"其他记忆"（`MemoryPageList.vue:69-96`）——没有"像册子一样翻阅"的体验。

## 目标

1. 列表页加**类型 Tab**（身份 4 类 + 普通类型分组展示，不再并桶）。
2. **offset 分页**（复用 `listMemoryWikiPages` 的 limit/offset）。
3. 时间/字母索引（按最近更新时间或标题首字分组），营造翻阅节奏。
4. 首页（R-04 的记忆 Wiki home）与列表不再过滤只显示身份 4 类。

## 范围

- `src/renderer/components/MemoryPageList.vue`（类型 Tab + 分页 + 索引）
- `src/renderer/api.js`（`listMemoryWikiPages` 已支持 limit/offset，确认透传；必要时补 grouping 参数）
- `src/renderer/components/` 记忆 Wiki home（R-04 后）入口适配
- `tests/frontend/memory-page-user-flow.test.mjs`、新增列表翻阅测试

## 设计要求

### 1. 类型 Tab

- Tab 分组建议：`身份`（identity_profile / identity_person / identity_preference / identity_trait）、`事件`、`主题`、`目标/项目/习惯/需要`（或每类一个 Tab，视页面空间；至少"身份 4 类不再与普通类型混排"）。
- 激活 Tab 决定请求的 `pageType` 过滤；"全部"Tab 保留（或去掉，以清爽为准）。

### 2. 分页

- 每页固定（如 20 条）或"加载更多"；请求带 `limit/offset`，响应 `items` 数量 < limit 即无更多。
- 翻页/加载更多按钮状态（加载中/到底）清晰；与现有筛选（status 等）组合使用。

### 3. 索引/分组

- 列表内按最近更新（时间轴式）或标题首字字母/拼音分组（分组头 + 条目），任选其一先落地；分组不改变请求语义（仍走分页）。

### 4. 普通类型可见

- 移除首页与列表的身份 4 类过滤（R-04 已处理首页；此处保证列表"全部/各类型 Tab"都能看到 event/topic/goal/project/routine/need）。

## 验收标准

1. 列表按类型 Tab 切换渲染对应类型条目；分页请求参数（limit/offset）正确；索引分组头渲染。
2. 普通类型（event/topic 等）在列表与首页可见。
3. 现有 memory-page-user-flow 测试适配后通过；`npx vitest run tests/frontend` 全绿。
4. 人工冒烟：记忆 Wiki 可一页页翻看不同类型，像翻册子。
5. 提交为 `feat(frontend): ...` 单提交（可拆 2 个：类型 Tab+分页 / 索引分组，各保持全绿），符合 commit 规范。

## 依赖

- R-04（导航拆分后新入口结构）。
