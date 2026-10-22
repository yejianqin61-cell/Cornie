# 490 Phase 3 记住想起追溯纠正脚本

## 1. Where this task sits

- **Phase 3 记忆能力成为 Demo 的主角**：目标是观众能复现完整记忆故事。
- 本任务固定“记住—想起—追溯—纠正”的演示脚本和证据。
- **开始前**：任务 484 至 489 完成。**完成后**：Phase 3 可以收口。

## 2. What the developer needs to know

**Read first**

- `tests/services/phase3-memory-e2e.test.mjs` — 已证明的真实步骤。
- `doc/Cornie-028-产品Demo改进施工计划.md` — Phase 3 目标和边界。
- `src/renderer/components/memory/MemoryWikiHomePage.vue` — 观众可操作入口。
- `doc/task/489-Phase3-可重置Demo记忆集.md` — 演示数据来源。

**Settled**

- 脚本以本地开发态 Demo 为前提。
- 每步要给出用户动作、可见证据和预期状态。
- 不声明安装包、云记忆或大规模检索能力。

**Edges and seam**

- 接缝是已完成的 HTTP、Memory Wiki 和治理 UI。
- 不新增产品行为。

**Run**

- `node tests/services/phase3-memory-e2e.test.mjs`
- `npm run build`

**Unknowns**

- 若某步 UI 尚不可见，停在该任务并引用缺口，不用后端日志替代。

## 3. The workflow

1. 阅读第 2 部分，复述：观众无需解释代码即可验证记忆闭环。
2. 从端到端测试提取真实动作和状态。
3. 写入四步演示脚本与重置前置条件。
4. 逐步对照 UI 与 API 证据复验。
5. 运行命令并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 记住 | 长期信息 | 出现记忆页 | 提炼链 |
| 想起 | 相关提问 | 读取记忆摘要 | 召回链 |
| 追溯 | 页面详情 | 显示来源 | source trace |
| 纠正 | 治理操作 | 页面更新或回滚 | governance |
| 重置 | Demo 数据集 | 回到初始状态 | demo loader |
