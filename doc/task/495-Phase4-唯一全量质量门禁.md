# 495 Phase 4 唯一全量质量门禁

## 1. Where this task sits

- **Phase 4 工程规则与当前产品一致**：目标是一个命令证明前端、后端、样式和联调契约同时成立。
- 本任务把 Vitest 前端测试、契约测试和现有后端测试纳入唯一全量门禁，并保证失败传播。
- **开始前**：任务 491 至 494 完成。**等待它**：任务 496、497 的最终收口。

## 2. What the developer needs to know

**Read first**

- `scripts/run-tests.mjs` — 当前 fast、integration、full 编排和退出码。
- `package.json` — 现有全量命令和 verify 入口。
- `vitest.config.js` — 前端测试范围与环境。
- `tests/services/phase3-memory-e2e.test.mjs` — 真实契约测试的运行方式。
- `doc/Cornie-028-产品Demo改进施工计划.md` — Phase 4 验收语句。

**Settled**

- `npm run test:full` 是唯一全量门禁入口。
- 前端 Vitest、后端服务测试和契约测试都必须由该入口运行。
- 任一子命令失败必须让全量命令非零退出。

**Edges and seam**

- 接缝是 `scripts/run-tests.mjs full` 与各现有测试命令的编排。
- 不复制测试逻辑，不改变业务断言。

**Run**

- `npm run test:full`
- `npm run build`

**Unknowns**

- 若前端测试与服务测试共享临时资源，先按现有清理约定隔离；不要放宽顺序来掩盖竞态。

## 3. The workflow

1. 阅读第 2 部分，复述：一个全量命令必须从检查运行到契约测试完成。
2. 先写失败的编排断言，证明当前全量遗漏前端测试或契约测试。
3. 将现有命令按依赖顺序接入 `full`，保留失败退出码。
4. 运行一次并修复真实的编排问题，不改业务行为。
5. 验证成功路径和一个可控失败路径都能被门禁识别。
6. 运行构建与全量门禁并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 前端测试 | Vitest 测试集 | 全量命令执行并通过 | `run-tests.mjs` |
| 后端测试 | 服务测试集 | 全量命令执行并通过 | full 编排 |
| 契约测试 | 本地 HTTP 契约 | 全量命令执行并通过 | contract runner |
| 子命令失败 | 人为失败测试 | 全量以非零退出 | 退出码传播 |
| 全量成功 | 所有测试通过 | 输出唯一 passed 结果 | `npm run test:full` |
