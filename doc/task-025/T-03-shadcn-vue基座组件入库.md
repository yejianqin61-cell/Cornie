# T-03 shadcn-vue 基座组件入库

## 背景

Cornie-026 已确认采用 shadcn-vue（复制进仓库模式）。Cornie-025 审计（F-03，P1）指出：无基础组件库，`.workspaceCard/.cardHead/.cardTitle` 三件套在 8 个 MemoryWiki 组件重复定义、`.emptyDetail` 空态 7 份副本、`.detailMeta` 4 份。本任务引入基座组件并完成首批收敛。

## 目标

1. shadcn-vue 初始化（依赖 reka-ui 行为层 + cva/clsx/tailwind-merge，具体以官方 CLI 当前版本为准）。
2. 首批基座组件入库 `src/renderer/components/ui/`：Button、Card(Head/Title/Content)、Dialog、Empty、Badge、ScrollArea（按需增删）。
3. 铃湾主题映射：基座组件默认色板全部替换为 `@theme` token（T-02 产物），保持暖色珊瑚视觉。
4. 收敛首批重复样式：8 处卡片三件套、7 处空态副本归一为 ui/ 组件引用。

## 范围

- `npx shadcn-vue@latest init`（Tailwind 配置指向 T-02 的 `@theme`；JS 项目按官方"manual"或 CLI 支持方式处理组件本地化）
- 新增 `src/renderer/components/ui/` 基座组件（JS 化，去类型或保留类型注解以可运行为准）
- 改造 `MemoryWikiConfirmationPanel / GovernanceDetailPanel / GovernanceQueuePanel / PageEditorPanel / PageListPanel / TopicIndexPanel / VersionPanel / Workspace` 中卡片与空态引用
- `tests/frontend/` 新增 `ui-base.test.mjs`（Button/Card/Dialog 行为与 a11y）

## 设计要求

### 1. 基座组件契约

- 统一命名 `UiButton / UiCard / UiDialog / UiEmpty / UiBadge / UiScrollArea`（或按 shadcn-vue 默认 `Button/Card/...` 命名，**二选一并写入规范**，避免与业务组件混淆）。
- 全部消费 token：禁用默认中性色板；颜色只来自 `@theme`。
- Dialog 等交互组件 a11y 行为（焦点圈定、Esc、aria）默认来自 reka-ui，测试覆盖。

### 2. 首批收敛

- 卡片三件套：`.workspaceCard/.cardHead/.cardTitle` 在 8 个文件中的重复定义删除，统一用 `UiCard` + 插槽（Head/Title/Content）。
- 空态：`.emptyDetail` 等 7 份副本收敛为 `UiEmpty`（props：icon/text/action 插槽）。
- 业务组件样式只保留自身差异（间距、布局），基础视觉不再自带。

### 3. 主题映射

- 在 `src/renderer/components/ui/` 顶层提供主题变量注入点（shadcn 的 CSS 变量约定与 T-02 `@theme` 对齐），保证后续组件全部走同一主题源。

### 4. 迁移节奏

- 本任务只收敛 MemoryWiki 面板族；LedgerHome/ObservationList 等其余重复样式在后续任务按同一模式消化（**不扩大本任务范围**）。

## 验收标准

1. 基座组件渲染为铃湾主题（抽查 Button 主色 = `--accent`、Card 圆角 = `--radius-*`）。
2. 收敛后：8 处卡片三件套、7 处空态副本的重复定义清零（以 grep 复核）。
3. `ui-base.test.mjs` 通过：Button 语义变体、Card 插槽、Dialog 打开/关闭/Esc/焦点圈定；a11y 专项纳入既有 `a11y.test.mjs` 或独立文件。
4. 既有 113 用例全绿；被改面板肉眼无回归（对照截图或逐项走查清单）。
5. 提交 `feat(frontend): 引入 shadcn-vue 基座组件并收敛 MemoryWiki 卡片/空态重复样式`。

## 依赖

- T-02（`@theme` token 就绪）；被 F-04 之后的前端编码规范任务引用。
