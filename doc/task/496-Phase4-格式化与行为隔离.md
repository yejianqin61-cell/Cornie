# 496 Phase 4 格式化与行为隔离

## 1. Where this task sits

- **Phase 4 工程规则与当前产品一致**：目标是格式化差异和行为修改可分别评审、分别回滚。
- 本任务在检查接线稳定后，只处理必要的纯格式化差异，并留下独立提交。
- **开始前**：任务 493、495 完成。**等待它**：任务 497 和 Phase 4 总结。

## 2. What the developer needs to know

**Read first**

- `.prettierrc.json` — 当前格式化规则。
- `.prettierignore` — 不应格式化的目录和产物。
- `git diff` — 本阶段行为改动与用户未提交改动的边界。
- `package.json` — 格式检查入口。

**Settled**

- 纯格式化提交不混入行为修复。
- 不格式化用户已有改动或生成物。
- 若源码已符合规则，只提交验证证据，不制造无意义 diff。

**Edges and seam**

- 接缝是 Phase 4 触及的 Vue 源码和 Prettier 检查范围。
- 不重排无关文件，不改运行时逻辑。

**Run**

- `npx prettier --check src`
- `npm run test:full`

**Unknowns**

- 若格式化会大面积改动既有行为文件，停下并缩小范围，不把噪声带入门禁提交。

## 3. The workflow

1. 阅读第 2 部分，复述：格式化只改变文本呈现，不改变行为。
2. 运行 Prettier 检查并列出 Phase 4 范围内的差异。
3. 先保存行为改动，再只应用必要格式化。
4. 对格式化文件运行测试和构建，确认行为不变。
5. 只提交格式化差异，并检查工作树仍隔离用户改动。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| Vue 格式 | Phase 4 Vue 文件 | Prettier 检查通过 | `src` |
| 行为快照 | 格式化前后测试 | 行为结果一致 | Vitest |
| 用户改动 | 未提交用户文件 | 不进入提交 | git 状态 |
| 无行为代码 | 格式化提交 | 无业务逻辑差异 | git diff |
| 全量回归 | 格式化后源码 | 全量门禁通过 | test:full |
