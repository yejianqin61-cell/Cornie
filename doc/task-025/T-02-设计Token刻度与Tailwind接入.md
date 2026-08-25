# T-02 设计 Token 刻度与 Tailwind 接入

## 背景

Cornie-025 审计（F-02，P0）：样式只有约 40 个颜色 token，**无字号/间距/圆角/阴影/z-index 刻度**；组件内硬编码 hex 64 处、`rgba()` 246 处、font-size 18 种取值。Cornie-026 已确认采用 Tailwind v4 作为样式底座，刻度由 `@theme` 承载，并保留旧 `--*` 变量兼容层。

## 目标

1. 接入 Tailwind CSS v4（Vite 插件方式）与现有 Vite/Vue 构建共存。
2. 建立 `@theme` 完整刻度：颜色（迁移现有）+ 字号 10 档 + 间距 + 圆角 5 档 + 阴影 + 动效。
3. 旧 `--*` 变量名兼容层：存量组件样式零改动。
4. Stylelint 叠加 token 强制规则（承接 T-01）。

## 范围

- 根目录新增 `tailwind` 相关入口（v4 以 `@import "tailwindcss"` + `@theme` 的 CSS-first 方式，Vite 侧用 `@tailwindcss/vite` 插件，具体以官方文档为准）
- `src/renderer/style.css`（或新增 `src/renderer/styles/tokens.css`）承载 `@theme` 与兼容层
- 示范性迁移 1~2 个组件（建议从审计中硬编码最多的 `LedgerHome.vue`、`MemoryPageDetail.vue` 各取一个样式块）验证工具类 + token 落地
- `scripts/verify-task025-tokens.mjs`：新增验证脚本

## 设计要求

### 1. Tailwind v4 接入

- 用官方 Vite 插件接入；确认与 `vite.config.js`、Electron 渲染进程构建、`vitest`（jsdom）兼容（jsdom 下工具类不生效不影响组件测试逻辑）。
- 生产构建产物体积增量记录在案（对比接入前后 dist 大小）。

### 2. `@theme` 刻度（映射表见 Cornie-026 §3）

- 颜色：`--bg/--surface/--text/--muted/--border/--accent/--danger/--success/--warning` 及 soft/tint 系列、`pet-*` 系列全部同值迁入 `--color-*`；
- 字号收敛：11/12/13/14/16/18/20/24/28/32px 十档（`--text-xs … --text-4xl`，命名按 Tailwind 语义），映射表写入文档供全局消费；
- 间距：4/8/12/16/20/24/32；
- 圆角：10/12/14/16/20px 五档（`--radius-*`）；
- 阴影、动效时长/缓动各一档起步；
- **兼容层**：同时输出旧名 `--bg/--surface/...` 指向同值，存量 CSS 零改动。

### 3. 禁止裸色值

- 承接 T-01 的 Stylelint 规则正式生效：新增代码不得出现裸 hex/rgba 字面色；alpha 变体统一 `color-mix(in srgb, var(--color-x) N%, transparent)`。
- 存量 64 hex + 246 rgba **不要求本任务全清**，但要在文档记录豁免清单与清理节奏（按文件随 F-03 迁移逐步消化）。

### 4. 示范迁移

- 从 `LedgerHome.vue` 与 `MemoryPageDetail.vue` 各抽一个典型区块（如"卡片头""详情元信息"）改为 token/工具类，作为后续迁移样板。

## 验收标准

1. `npm run build` 通过；dev 与打包两种形态下页面正常渲染（Electron 启动冒烟）。
2. `@theme` 刻度齐全，`verify:task025` 脚本校验：所有 `--color-*` 存在、字号/间距/圆角档位齐全、存量 `--*` 兼容名可解析。
3. Stylelint 对新增裸 hex/rgba 报错；豁免清单有文档记录。
4. 示范迁移区块样式与迁移前视觉一致（无肉眼回归）。
5. 既有前端测试全绿；提交 `feat(frontend): 接入 Tailwind v4 与设计 Token 刻度`。

## 依赖

- T-01（Stylelint 已接入）；被 T-03（shadcn-vue 初始化）依赖。
