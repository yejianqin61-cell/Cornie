# 489 Phase 3 可重置 Demo 记忆集

## 1. Where this task sits

- **Phase 3 记忆能力成为 Demo 的主角**：目标是演示有可理解的长期记忆素材。
- 本任务提供人物、偏好、事件和冲突组成的可重置 Demo 记忆集。
- **开始前**：任务 484 定义真实读取链。**等待它**：任务 490 固定演示脚本。

## 2. What the developer needs to know

**Read first**

- `electron/backend/memory-wiki/pageModel.js` — 页面合法字段与类型。
- `electron/backend/memory-wiki/service.js` — 创建页面和来源规则。
- `tests/shared/service-harness.mjs` — 隔离目录和清理方式。
- `scripts` — 现有可执行验证脚本的命名方式。

**Settled**

- 数据集只用于本地 Demo，不写入默认用户数据。
- 重置必须幂等，重复执行得到相同页面集合。
- 人物、偏好、事件和冲突各至少一页。

**Edges and seam**

- 接缝是 Memory Wiki service 的创建 API。
- 不引入外部下载、云数据或随机生成。

**Run**

- `node tests/services/phase3-demo-memory.test.mjs`
- `npm run test:full`

**Unknowns**

- 若脚本需要目标目录，必须显式传入；不得覆盖用户工作数据。

## 3. The workflow

1. 阅读第 2 部分，复述：Demo 数据可重复装载且不污染用户数据。
2. 为首轮装载写失败测试。
3. 为重复装载幂等性写失败测试。
4. 提供最小数据集与显式重置入口。
5. 运行命令并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 首次装载 | 空目录 | 创建四类页面 | demo loader |
| 重复装载 | 同一目录 | 页面数量不增加 | demo loader |
| 人物 | Demo 集 | 可读到人物页 | `memoryWiki.get()` |
| 冲突 | Demo 集 | 可读到冲突页 | `memoryWiki.get()` |
| 隔离 | 临时目录 | 不写入工作目录 | loader options |
