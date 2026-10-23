# 494 Phase 4 组件库与图标警告清理

## 1. Where this task sits

- **Phase 4 工程规则与当前产品一致**：目标是测试过程没有 Vue 框架、组件库或图标属性警告。
- 本任务清理任务 491 样本中已复现的警告，保持当前 UI 行为和组件库不变。
- **开始前**：任务 491、493 完成。**等待它**：任务 495 的无警告全量门禁。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/memory/MemoryWikiHomePage.vue` — 警告产生的页面入口。
- `src/renderer/components/common/PageHeader.vue` — 图标 prop 的声明和消费方式。
- `src/renderer/components/memory/MemoryWikiHomePage.test.js` — 现有挂载环境和警告输出。
- `node_modules/neobrutalism-vue` — Button 实际 prop 约定。

**Settled**

- 先用测试捕获真实 `console.warn`，再修最窄的生产契约。
- Lucide 图标必须符合 `PageHeader` 的 prop 形状。
- 不迁移 `neobrutalism-vue`，不通过全局静默隐藏警告。

**Edges and seam**

- 接缝是组件真实挂载时的 `console.warn` 与图标/Button prop 传递。
- 不扩展到无关页面或视觉重设计。

**Run**

- `npx vitest run src/renderer/components/memory/MemoryWikiHomePage.test.js`
- `npm run build`

**Unknowns**

- 若警告来自依赖内部且无法由生产调用修正，保留最小隔离说明并停止全局替换。

## 3. The workflow

1. 阅读第 2 部分，复述：警告必须在真实挂载中被看见并在生产契约处消除。
2. 写失败测试，捕获目标组件挂载期间的 `console.warn`。
3. 逐条确认警告来源和 prop 期望，不把依赖噪声误判为页面错误。
4. 以最小生产改动修正图标或 Button 传值。
5. 运行测试和构建，确认无警告且行为断言仍通过。
6. 提交测试与修复。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 图标 prop | 页面标题图标 | 挂载无 icon 类型警告 | `PageHeader` |
| Button prop | 页面操作按钮 | 挂载无 `as`/`asChild` 警告 | Button 调用 |
| 行为保留 | 点击页面操作 | 原动作仍发生 | 用户点击 |
| 空状态 | 无数据挂载 | 无 Vue 警告且显示空状态 | 页面挂载 |
| 全页测试 | 组件测试集 | 控制台无目标警告 | Vitest |
