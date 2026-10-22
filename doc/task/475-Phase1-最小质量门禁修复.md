# 475 Phase 1 最小质量门禁修复

## 1. Where this task sits

- **Phase 1 一条真实聊天链能走完**：目标是发送、流式显示、历史重载和确认动作都可完成。
- 本任务落实 **R-8 统一当前架构规范与质量门禁** 的最小修复，解除全量测试被 lint 提前阻断。
- 可在聊天功能完成后执行；完成后，Phase 1 可用全量命令给出证据。

## 2. What the developer needs to know

**Read first**

- `package.json` — `test:full` 在什么位置先执行 lint。
- `eslint.config.js` — 哪些目录当前实际被规则覆盖。
- `vite.config.js` — `__dirname` 在 ESM 配置中为何触发 lint。
- `vitest.config.js` — 同类 ESM 配置错误是否共享根因。
- `scripts/run-tests.mjs` — 全量命令的真实顺序与失败出口。

**Settled**

- 只修复阻断 `npm run test:full` 的最小 ESLint 错误。
- ESM 配置使用标准 ESM 路径写法；不关闭 `no-undef`。
- 不在本任务开启全仓 Vue lint、Stylelint 改造或格式化 97 个文件。

**Edges and seam**

- 接缝是构建与测试配置中的 ESM 路径解析。
- 不改变应用运行时、测试范围或 Prettier 基线。

**Run**

- `npm run lint`
- `npm run test:full`
- `npm run build`（仓库未提供独立 typecheck 脚本）。

**Unknowns**

- 若 lint 通过后出现存量格式问题，记录首个独立阻断项；不得把无关格式化塞进此任务。
- 若全量测试暴露功能失败，转给对应聊天任务，不在配置中屏蔽。

## 3. The workflow

1. 阅读第 2 部分，复述：让门禁能执行真实测试，不扩大规范改造。
2. 运行 lint，产出当前首个确定的 ESM 配置错误。
3. 为配置加入最小标准 ESM 路径定义，产出无 `__dirname` 未定义错误。
4. 再跑 lint，确认未通过规则关闭来掩盖问题。
5. 运行全量测试和构建，产出后续真实失败或成功证据。
6. 提交门禁修复意图。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| Vite 配置 | `npm run lint` | 无 `__dirname` 错误 | `vite.config.js` |
| Vitest 配置 | `npm run lint` | 无 `__dirname` 错误 | `vitest.config.js` |
| 规则有效 | 未定义变量样例 | 仍会被 ESLint 拒绝 | ESLint 配置 |
| 全量入口 | `npm run test:full` | 不因 lint 提前退出 | `run-tests.mjs` |
| 构建入口 | `npm run build` | 成功生成产物 | Vite |
