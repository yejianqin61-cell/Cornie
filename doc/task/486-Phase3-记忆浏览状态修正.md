# 486 Phase 3 记忆浏览状态修正

## 1. Where this task sits

- **Phase 3 记忆能力成为 Demo 的主角**：目标是读者能看懂已记住的内容。
- 本任务修正主题筛选、编辑刷新和版本比较的页面状态。
- **开始前**：任务 484 定义读取契约。**等待它**：任务 488 扩展人类操作入口。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/memory/MemoryWikiHomePage.vue` — 页面状态和 API 调用。
- `src/renderer/api/memory-wiki.js` — 已有主题、页面和版本端点。
- `electron/backend/memory-wiki/routes.js` — 可用筛选参数。
- `src/renderer/components/memory/memory.test.js` — 组件回归范围。

**Settled**

- 主题筛选按主题索引语义，不冒充 page type。
- 保存后重载列表和当前详情。
- 少于两个版本时给出可理解状态，不打开空比较。

**Edges and seam**

- 接缝是 Memory Wiki 页面状态到既有 API。
- 不重做页面视觉或增加状态库。

**Run**

- `npx vitest run src/renderer/components/memory --maxWorkers=1`
- `npm run build`

**Unknowns**

- 若后端没有主题筛选参数，前端在已加载摘要中筛选并记录限制。

## 3. The workflow

1. 阅读第 2 部分，复述：筛选、编辑和比较必须反映真实页面状态。
2. 为主题筛选与编辑后详情写失败测试。
3. 为单版本比较写失败测试。
4. 在 Home 页面修正最小状态转换。
5. 运行命令并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 主题筛选 | 一个主题键 | 仅显示匹配页 | `filterByTopic()` |
| 编辑页面 | 当前页保存 | 详情显示新摘要 | `onSave()` |
| 两版本 | 两个版本 | 显示差异 | `openCompare()` |
| 单版本 | 一个版本 | 显示不可比较说明 | `openCompare()` |
| 读取失败 | 页面 API 失败 | 显示可重试错误 | `fetchPages()` |
