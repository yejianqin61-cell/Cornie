# 502 Phase 5 Demo 数据载入重置隔离

## 1. Where this task sits

- **Phase 5 安装包离开开发机也能演示**：目标是 Demo 数据可载入、可重置且不污染真实用户数据。
- 本任务把现有 Demo memory loader 扩展为显式、幂等、可隔离的演示数据入口。
- **开始前**：任务 498 完成。**等待它**：任务 504 的固定演示路线。

## 2. What the developer needs to know

**Read first**

- `scripts/load-demo-memory.mjs` — 当前命令参数和 baseDir 入口。
- `electron/backend/memory-wiki/demoMemory.js` — Demo 页面集合和幂等创建逻辑。
- `electron/backend/memory-wiki/constants.js` — memory layer 目录布局。
- `src/renderer/api/memory-wiki.js` — 页面和治理 API 边界。
- `doc/Cornie-031-Phase3-记忆Demo演示脚本.md` — 已固定的演示素材和步骤。

**Settled**

- Demo 数据必须写入显式传入的隔离 baseDir。
- 重复载入不重复创建，重置不删除用户真实数据。
- 不把 Demo 数据硬编码进生产迁移或默认用户数据库。

**Edges and seam**

- 接缝是 loader 命令、memory baseDir 和 Demo 页面集合。
- 不新增云同步、向量数据库或批量治理能力。

**Run**

- `npm run load:demo-memory -- --base-dir <temporary-directory>`
- `node tests/services/phase3-demo-memory.test.mjs`

**Unknowns**

- 若产品 UI 没有安全的重置入口，先保留命令级入口并记录缺口，不删除真实目录。

## 3. The workflow

1. 阅读第 2 部分，复述：Demo 数据只进入隔离 baseDir，载入和重置都可重复。
2. 写失败测试，验证重复载入计数和用户目录隔离。
3. 补齐显式 reset 语义或最小命令入口。
4. 验证四类记忆页面和治理素材都能读取。
5. 从干净目录重复载入、重置和再次载入。
6. 运行 Demo 测试和全量门禁并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 首次载入 | 空 baseDir | 创建固定 Demo 页面 | loader |
| 重复载入 | 同一 baseDir | 不重复创建 | idempotency |
| 隔离载入 | 用户目录与 Demo 目录 | 两者互不污染 | baseDir |
| 重置 | Demo reset | Demo 目录回到空状态 | reset path |
| 再载入 | reset 后载入 | 页面集合恢复 | demo loader |
