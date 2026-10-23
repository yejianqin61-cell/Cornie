# 493 Phase 4 Vue 源码检查接线

## 1. Where this task sits

- **Phase 4 工程规则与当前产品一致**：目标是 Vue 源码进入有效的脚本、格式和样式检查。
- 本任务把检查工具接到现有源码范围，并沿用已安装依赖能覆盖的最小配置。
- **开始前**：任务 491、492 完成。**等待它**：任务 494、495 使用这些检查。

## 2. What the developer needs to know

**Read first**

- `eslint.config.js` — 当前 flat config 和被忽略的 `src` 范围。
- `package.json` — 已安装 ESLint、Prettier、Stylelint 和 Vue 构建依赖。
- `.stylelintrc.json` — 现有 CSS token 规则和例外。
- `.stylelintignore` — 当前样式检查排除范围。
- `src/renderer/components/memory/MemoryWikiHomePage.vue` — SFC 检查样本。

**Settled**

- 优先复用已安装依赖；缺依赖时先停在明确缺口，不静默降低检查范围。
- 保留现有 token 规则和 `src/renderer/styles/tokens.css` 例外。
- 检查配置只覆盖当前 Vue 源码，不改变业务行为。

**Edges and seam**

- 接缝是 `eslint.config.js`、Prettier 命令、Stylelint SFC 解析和 `src` 文件范围。
- 不在本任务修复组件行为或迁移样式体系。

**Run**

- `npm run lint`
- `npx stylelint "src/**/*.vue" "src/**/*.css"`

**Unknowns**

- 若缺少 Vue SFC 解析器，先确认 lockfile 是否已有可复用包；需要新增依赖时停止并说明理由。

## 3. The workflow

1. 阅读第 2 部分，复述：源码检查必须覆盖 Vue 脚本、模板、格式和样式。
2. 用组件样本先运行现有检查，记录第一个真实失败。
3. 补最小 ESLint、Prettier 和 Stylelint 范围配置。
4. 逐项运行检查，修复配置误报而不改变业务逻辑。
5. 将失败输入保留为可重复命令或测试样本。
6. 运行构建与现有后端检查并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| Vue 脚本 | SFC `<script>` | ESLint 通过 | `eslint.config.js` |
| Vue 模板 | SFC template | 无未定义模板错误 | Vue lint |
| Vue 格式 | 缩进异常 SFC | Prettier 能报告差异 | Prettier |
| CSS 样式 | token 变量 CSS | Stylelint 通过 | Stylelint |
| 全部范围 | `src` 源码 | 一次检查无遗漏 | lint 命令 |
