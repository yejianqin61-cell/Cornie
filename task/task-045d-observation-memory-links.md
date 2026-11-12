# task-045d 观察详情展示关联记忆并可跳转

## 1. Where this task sits

- **Phase 5 后端已有的能力都能在界面用上**，目标是主人能在界面上管理三域类目、编辑日程、搜索聊天，看到联想话语和关联记忆，不再需要通过对话绕路。
- **本任务推进 R-13 观察详情展示它关联的记忆**：后端反查引用这条观察的记忆页，前端展示并支持点击跳转。
- **Starts after**：task-045c 聊天的联想话语与工具结果保留。**Waits on**：task-045e 日程编辑。

## 2. What the developer needs to know

**Read first**

- `electron/backend/observation/routes.js` 的 `GET /observations/:id` — 返回 `{ observation }`，没有 `memoryLinks`；路由工厂 `observationRoutes({ store })` 拿不到数据目录。
- `electron/server.js` — `observationRoutes` 在哪里挂载，`baseDir` 在哪里可用。
- `electron/backend/memory-wiki/service.js` — 记忆页的 `sourceRefs` 里观察来源的形状：`{ kind: 'observation', observationId }`；`list`、`get`。
- `src/renderer/components/observe/ObservationLinkedMemory.vue`、`ObservationDetailPage.vue`、`ObservationListPage.vue` — 前端已经读 `observation.memoryLinks`（元素用 `pageId`、`title`），但链接没有点击行为。
- `src/renderer/App.vue` — 模块切换用 `activeModule`，没有路由。
- `tests/services/observation-routes.test.mjs`、`src/renderer/components/observe/observation.test.js`。

**Settled**

- 后端：记忆服务新增 `findPagesReferencingObservation(observationId)`，遍历非归档页面，返回 `[{ pageId, title }]`；`GET /observations/:id` 的响应新增 `memoryLinks`（该方法的结果）。`observationRoutes` 增加 `baseDir` 参数，`server.js` 传入。
- 性能：遍历要逐页读文件，页面很多时偏慢。本任务不建反向索引，只在收口简报里记录（来源：`doc/Cornie-040-审计后改进计划.md` R-13 的 Hard part）。
- 前端跳转链路固定：`ObservationLinkedMemory` 点击触发 `open`（载荷 `pageId`）→ `ObservationDetailPage` 转发 `openMemory` → `ObservationListPage` 转发 `openMemory` → `App.vue` 的 `openMemoryPage(pageId)`：设置 `memoryFocusPageId` 并把 `activeModule` 切到 `memory`。
- `MemoryWikiHomePage` 新增属性 `focusPageId`（字符串，缺省空）：页面列表加载完成后，若有该属性就调用 `selectPage(focusPageId)`。
- 没有关联时，`ObservationLinkedMemory` 已经不渲染（现有行为，保持）。

**Edges and seam**

- Seam：后端用真实 HTTP（`observation-routes.test.mjs`，已有）；前端用 `observation.test.js` 和 `MemoryWikiHomePage.test.js`。不新增 seam。
- 改 `memory-wiki/service.js`、`observation/routes.js`、`server.js`、三个观察组件、`App.vue`、`MemoryWikiHomePage.vue` 和这些测试文件。

**Run**

- `node tests/services/observation-routes.test.mjs`
- `npx vitest run src/renderer/components/observe src/renderer/components/memory`
- `npm run lint`

**Unknowns**

- 如果 `App.vue` 没有现成的测试文件，不要为这一处接线新建复杂的挂载测试；用 `ObservationListPage` 触发 `openMemory` 事件的测试覆盖前半段，`MemoryWikiHomePage` 的 `focusPageId` 测试覆盖后半段，并在收口简报里写明 `App.vue` 的接线未被自动化测试覆盖。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：详情页展示引用这条观察的记忆页，点击跳到记忆页。
2. 先写后端 Case 1、Case 2 的红测试。
3. 实现 `findPagesReferencingObservation`，改路由和 `server.js`。
4. 先写前端 Case 3 至 Case 5 的红测试。
5. 改三个观察组件的事件转发，改 `App.vue`，给 `MemoryWikiHomePage` 加 `focusPageId`。
6. 运行第 2 部分的三条命令。
7. 提交：`feat(observation): show the memory pages that cite an observation`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 建一条观察和一个 `sourceRefs` 含该观察的记忆页（标题 `钟奕菲`），`GET /observations/:id` | `memoryLinks` 恰含 `{ pageId, title: '钟奕菲' }` | 真实 HTTP |
| 2 | 没有任何页引用的观察 | `memoryLinks` 为空数组；引用它的页面已归档时同样为空 | 真实 HTTP |
| 3 | 详情页收到 `memoryLinks`，点击其中一项 | `ObservationLinkedMemory` 触发 `open`，载荷为该 `pageId` | 观察组件 |
| 4 | `ObservationListPage` 的详情触发 `openMemory` | 列表页向上触发 `openMemory`，载荷为该 `pageId` | `ObservationListPage` |
| 5 | `MemoryWikiHomePage` 以 `focusPageId='coffee-page'` 挂载 | 列表加载后调用 `getPage('coffee-page')` | `MemoryWikiHomePage` |

页面标题、ID 是测试里创建数据时写死的字面量。
