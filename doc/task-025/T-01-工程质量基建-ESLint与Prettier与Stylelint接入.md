# T-01 工程质量基建：ESLint + Prettier + Stylelint 接入

## 背景

Cornie-025 审计（F-01，P0）：前端无任何静态检查工具，`npm run lint` 目前是 `echo "(no lint configured)"`。死代码已开始出现（App.vue 死导入 `MemoryPageDetail`），token 违例、未用变量、Vue 反模式无人拦截。本任务补上地板。

## 目标

1. 接入 ESLint（含 `eslint-plugin-vue`，`vue/essential` 起步）+ Prettier + Stylelint。
2. 修复现存全部违例（含 App.vue 死导入）。
3. `lint` 进入 `test:fast` 门禁。

## 范围

- 根目录新增 `eslint.config.js`（flat config）、`.prettierrc.json`、`.prettierignore`、`.stylelintrc.json`（或 `stylelint.config.mjs`）
- `package.json`：devDependencies 新增 `eslint`、`eslint-plugin-vue`、`prettier`、`eslint-config-prettier`、`stylelint`、`stylelint-config-standard`（按官方文档当前版本为准）；`lint` 脚本改为真实执行并串联三项
- `scripts/run-tests.mjs`：fast 档追加 lint 门禁
- 全量修复 `src/renderer/`、`electron/backend/` 现存违例（以实际 lint 输出为准，逐类修复；后端如改动面过大可在本任务只启用前端，后端后续任务补——**以文档记录决策**）

> **范围决策（2026-08-25 实施记录）**：本批 lint 仅启用前端（`src/renderer/**` + `tests/frontend/**`），见 `eslint.config.js` 头部注释与 `.prettierignore`/`.stylelintignore`。后端 `electron/` 与 `scripts/`（85 文件 / 16.5k 行）因需 node 全局环境且修复面大，留待后续独立任务接入。

## 设计要求

### 1. ESLint

- flat config：`eslint.config.js`，vue 文件用 `plugin:vue/essential`（`eslint-plugin-vue` 的 flat 配置形式），JS 文件 `eslint:recommended`。
- 打开 `no-unused-vars`（此规则即可捕获死导入类问题）；`vue/multi-word-component-names` 视代码现状决定开/关并记录理由。
- 不引入 TS 相关插件（项目为 JS）。

### 2. Prettier

- 与现有代码风格对齐：单引号、无分号（`semi: false`）、2 空格缩进；其余以当前代码库多数风格为准，差异过大处先格式化后提交。
- 通过 `eslint-config-prettier` 关闭 ESLint 与 Prettier 冲突的规则。

### 3. Stylelint

- `stylelint-config-standard` 起步；打开自定义规则：**禁止新出现的裸 hex/rgba 字面色**（`color-no-hex` 类规则若与存量冲突，可先加"仅告警"或 ignore 文件名单，**必须记录豁免清单**）。
- 覆盖 `*.vue` 内 `<style>` 块（stylelint 对 vue 的配置以官方文档为准）。

### 4. 死代码修复

- App.vue 移除未使用的 `MemoryPageDetail` import（`bbcea91` 退役旧列表视图后的遗留）。

### 5. 门禁

- `test:fast`（`scripts/run-tests.mjs`）fast 档在测试前先执行 lint，非零退出即失败。

## 验收标准

1. `npm run lint` 真实执行且**零告警**。
2. `npm run test:fast` 通过（lint + fast 档测试）。
3. App.vue 死导入已移除；git diff 中无"仅为了过 lint 的无意义改动"（每类修复有明确理由）。
4. 既有前端测试（22 文件 / 113 用例）全绿。
5. 提交为 `chore(frontend): 接入 ESLint/Prettier/Stylelint 并修复现存违例`，符合 commit 规范。

## 依赖

- 无（P0 先行，独立可验收）；T-02 的 Stylelint token 规则在此基础上叠加。
