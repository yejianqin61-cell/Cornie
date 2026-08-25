# Cornie 前端组件库选型与落地方案

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | Cornie 前端组件库选型与落地方案 |
| 文件名称 | Cornie-026-前端组件库选型与落地方案.md |
| 产品名称 | Cornie（铃湾 / 小铃湾） |
| 文档编号 | Cornie-026 |
| 文档类型 | 设计方案（Spec） |
| 文档版本 | V1.0 |
| 文档状态 | 生效中 |
| 编写日期 | 2026-08-22 |
| 适用对象 | 研发 / 测试 |
| 上游文档 | `doc/Cornie-025-前端工程规范审计报告.md`（F-01~F-07 路线图） |
| 下游文档 | `doc/task-025/T-01~T-03`（首批改造任务） |
| 关联规范 | `criterion/Cornie-doc文档规范.md`、`criterion/Cornie-commit-message规范.md` |

### 1.1 修订记录

| 版本 | 日期 | 修订人 | 修订说明 |
| ---- | ---- | ------ | -------- |
| V1.0 | 2026-08-22 | 叶健钦 / AI | 用户确认选型方向为 **shadcn-vue + Tailwind**；本方案定义选型依据、token 映射、分阶段落地顺序与首批任务拆分 |

---

## 2. 选型结论

> **采用 [shadcn-vue](https://www.shadcn-vue.com/)（复制进仓库模式）+ [Tailwind CSS v4](https://tailwindcss.com/) 作为样式底座；无障碍原语层由 shadcn-vue 依赖的 [reka-ui](https://reka-ui.com/)（原 Radix Vue）提供。**

一句话理由：shadcn-vue 是 shadcn/ui 的官方 Vue 移植版（v2.8.2，2026-08 仍在活跃维护，社区评价"与 React 版 99% 一致"），其"**组件源码复制进仓库、完全归项目所有**"的模式与 Cornie 的 doc/task 任务文化天然契合——每个入库组件就是一份"复制 + 适配"任务；同时从根上消除 Cornie-025 审计指出的"卡片三件套 8 份副本、空态 7 份副本"问题，并免费获得无障碍行为（对应 `tests/frontend/a11y.test.mjs` 已在守护的能力）。

### 2.1 候选对比（2026-08 时点）

| 方案 | 模式 | 与 Cornie 契合度 | 结论 |
| --- | --- | --- | --- |
| **shadcn-vue** | 复制进仓库 + Tailwind | ★★★★★ 代码全归己有、可审计、可深度定制 | **采用** |
| reka-ui（原 Radix Vue） | 无样式原语 | ★★★★ 保留纯 CSS，但组件需自建 | 作为 shadcn-vue 的行为底座随附，不单独引入 |
| Naive UI | 全家桶 | ★★★ 引入即用，但设计语言需覆盖定制 | 不采用 |
| Element Plus | 全家桶 | ★★ 企业后台气质，与"陪伴感桌宠"产品定位不符 | 不采用 |
| PrimeVue / Vuetify | 全家桶 | ★★ 风格强绑（Material） | 不采用 |

### 2.2 关键决策点（用户已确认）

1. **接受 Tailwind 作为样式底座**（此前为纯 CSS + `:root` 变量）——CSS 仍可共存，迁移渐进进行；
2. 组件以 **JS 版本入库**（项目为 JavaScript 而非 TypeScript，复制组件后自行去类型化或保留类型注解均可，以运行时可执行为准）；
3. 保持铃湾暖色视觉（珊瑚强调色、圆角卡片、模块 tint），不采用 shadcn 默认中性色板。

---

## 3. Token 映射策略（对 Cornie-025 F-02 的修订）

Cornie-025 提出补全 token 刻度（字号/间距/圆角/阴影/z-index）。引入 Tailwind v4 后，刻度以 **Tailwind v4 `@theme`** 承载，并**保留既有 `--*` CSS 变量名兼容层**，使迁移期间旧组件零改动：

| 现有资产（style.css `:root`） | 目标形态（Tailwind v4 `@theme`） |
| --- | --- |
| `--bg / --surface / --surface-2 / --text / --muted / --border` | `--color-bg / --color-surface / ...`（同值迁移） |
| `--accent / --accent-hover / --danger / --success / ...` | `--color-accent / --color-danger / ...` |
| `--chat-tint / --diary-tint / ...` | `--color-tint-chat / --color-tint-diary / ...` |
| `--pet-*` 桌宠系列 | `--color-pet-*`（桌宠面板可最后迁移或保留为普通 CSS 变量） |
| （无）字号刻度 | `--text-xs … --text-3xl` 命名阶：11/12/13/14/16/18/20/24/28/32px（收敛现有 18 种手拍值为 10 档） |
| （无）间距刻度 | `--spacing-*`：4/8/12/16/20/24/32px |
| （无）圆角刻度 | `--radius-*`：10/12/14/16/20px 五档 |
| （无）阴影/动效 | `--shadow-*`、`--ease-*` / `--duration-*` |
| 组件内 64 处 hex + 246 处 `rgba()` | 迁移为 token 或 `color-mix(in srgb, var(--color-x) N%, transparent)` |

**兼容层做法**：在 `@theme` 中同时输出 `--color-*`（供 Tailwind 工具类）与 `--bg/--surface/...` 旧名（供存量 CSS 直接使用），两套名字指向同一值；旧组件样式在 T-02 验收后按文件逐步改为工具类或新 token，**允许长尾共存**，不要求一次性全量替换。

---

## 4. 落地顺序（修订 Cornie-025 §6 路线图）

> 原则不变：**静态检查先行**，任何视觉重构之前先把"劣化无人拦截"的地板补上。

| 批次 | 内容 | 对应任务 |
| --- | --- | --- |
| **F-01** | ESLint（vue/essential）+ Prettier + Stylelint 接入，修复现存违例（含 App.vue 死导入），`lint` 进 `test:fast` | `doc/task-025/T-01` |
| **F-02** | Tailwind v4 接入 + `@theme` token 刻度落地 + 兼容层；Stylelint 规则禁止新增裸 hex/rgba 字面色 | `doc/task-025/T-02` |
| **F-03** | shadcn-vue 初始化 + 首批基座组件入库（Button/Card/Dialog/Empty/Badge/ScrollArea…），映射铃湾主题色 | `doc/task-025/T-03` |
| **F-04** | `criterion/Cornie-frontend-coding规范.md` 入库（SFC 顺序、类命名法、composable/api 约定） | 后续任务（未拆分） |
| **F-05** | vue-router（hash）替换 App.vue v-if 链与子视图栈字符串 | 后续任务（未拆分） |
| **F-06** | api.js 按域拆分 `api/` 目录 | 后续任务（未拆分） |
| **F-07** | 记忆 Wiki Home/Workspace 双入口归一，1205 行组件拆分 | 后续任务（未拆分） |

**迁移节奏**：存量组件**不改不动**，只在新代码与重构点上使用新基建；每批任务自带验收脚本，与既有 `verify:*` 体系保持一致。

---

## 5. 风险与对策

| 风险 | 对策 |
| --- | --- |
| Tailwind 与存量 scoped CSS 并存期双样式源 | 兼容层保证旧 CSS 不变；新组件统一走工具类；Stylelint 把关新代码 |
| shadcn-vue 生态面向 TS/Tailwind v3 文档混存 | 以官方文档为准；组件复制后本地化（JS 化）并入库即归项目所有，之后可自由演进 |
| 铃湾暖色主题与 shadcn 默认中性风冲突 | 只借组件骨架，主题完全由 `@theme` 覆盖；不引入默认色板 |
| Electron 渲染进程样式体积 | Tailwind v4 按需生成 + Vite 打包；入库组件保持克制，不整包引入 |

---

## 6. 验收口径（总）

1. `npm run lint` 真实执行且零告警；`test:fast` 含 lint 门禁；
2. `@theme` token 刻度生效，新组件全部消费 token；Stylelint 拦截新增裸色值；
3. 首批基座组件在仓库 `src/renderer/components/ui/` 下、铃湾主题渲染正确、a11y 测试覆盖 Dialog 等关键交互；
4. 全部既有前端测试（22 文件 / 113 用例）保持全绿。
