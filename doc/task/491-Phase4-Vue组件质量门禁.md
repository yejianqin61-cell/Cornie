# 491 Phase 4 Vue 组件质量门禁

## 1. Where this task sits

- **Phase 4 工程规则与当前产品一致**：目标是一次全量门禁同时证明源码、样式、前端、后端和契约成立。
- 本任务先选一个现有 Vue 组件，固定脚本、模板、样式和单元测试的最小质量缝。
- **开始前**：Phase 3 完成。**等待它**：任务 492 至 497 复用这条质量缝。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/memory/MemoryWikiHomePage.vue` — 组件模板、脚本和样式边界。
- `src/renderer/components/memory/MemoryWikiHomePage.test.js` — 现有挂载和断言方式。
- `package.json` — 当前前端测试、构建和格式命令。
- `vite.config.js` — Vue 源码的构建入口。

**Settled**

- 继续使用 Vue Test Utils、Vitest 和现有组件库。
- 只收口一个现有组件，不做视觉重设计。
- 质量断言必须围绕用户可见行为，不测试实现细节。

**Edges and seam**

- 接缝是 `MemoryWikiHomePage` 的真实挂载与用户动作。
- 不引入全局状态库、路由迁移或新的组件抽象。

**Run**

- `npx vitest run src/renderer/components/memory/MemoryWikiHomePage.test.js`
- `npm run build`

**Unknowns**

- 若组件依赖在 jsdom 中无法挂载，先记录最小缺口；不要用测试替身掩盖生产契约。

## 3. The workflow

1. 阅读第 2 部分，复述：一个现有组件必须同时通过行为、脚本、模板和样式检查。
2. 为组件当前稳定行为写一个失败的用户可见断言。
3. 运行组件测试，确认失败来自目标行为而非环境噪声。
4. 以最小改动修正组件并保留现有 API 边界。
5. 分别运行组件测试、构建和将由后续任务接入的检查命令。
6. 提交本任务的测试与行为改动。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 初始加载 | 真实页面挂载 | 页面标题和记忆列表可见 | `MemoryWikiHomePage` |
| 空列表 | 无记忆数据 | 显示空状态而不是异常 | 组件渲染 |
| 选中条目 | 点击记忆条目 | 详情区域显示对应摘要 | 用户点击 |
| 刷新详情 | 完成一次页面操作 | 列表和详情保持一致 | 页面状态 |
| 构建 | Vue SFC 源码 | Vite 构建成功 | `npm run build` |
