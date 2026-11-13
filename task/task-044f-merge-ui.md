# task-044f 记忆页面的合并入口

## 1. Where this task sits

- **Phase 4 主人能看见并纠正记忆治理**，目标是主人在记忆页能确认一页、合并两页、触发巡检，并在审计视图看到这些操作；治理面板全部是中文。
- **本任务推进 R-10 记忆页面能在界面上合并**：详情页选一页并入当前页，确认后归档被并入的页。
- **Starts after**：task-044e 巡检按钮与审计视图。**Waits on**：task-044g 收口。

## 2. What the developer needs to know

**Read first**

- `src/renderer/api/memory-wiki.js` 的 `mergePages(targetPageId, sourcePageId)` — 已存在，接口 `POST /memory-wiki/pages/merge`。
- `src/renderer/components/common/ConfirmDialog.vue` — 确认弹窗：`open`、`title`、`message`，以及函数属性 `onConfirm`、`onCancel`（不是事件）。
- `src/renderer/components/memory/MemoryWikiTree.vue` — `grouped` 在 `setup` 里只算一次，列表变化后不会更新；分组标题只认 4 种旧类型。
- `src/renderer/components/memory/MemoryWikiHomePage.vue` — `fetchPages`、`selectPage`、`runPageAction` 的刷新方式。

**Settled**

- 当前页是合并目标（保留），被选中的页是来源（会被归档）。后端语义来自 `service.js` 的 `mergePages`：目标合并来源的别名、关联、来源引用和正文，来源被归档（`doc/Cornie-040-审计后改进计划.md` R-10）。
- 详情页新增"合并"按钮，事件名 `merge`；页面处理函数固定为 `openMerge()`（打开来源选择）、`confirmMerge(sourcePageId)`（弹确认）、`applyMerge()`（真正调用接口）。
- 来源候选：`allPages` 中状态不是 `archived` 且不是当前页的页面，用原生下拉选择。
- 确认文案固定：`将「<来源标题>」合并进「<目标标题>」，「<来源标题>」会被归档。`
- 合并成功后重新读取列表并选中目标页；失败时把错误显示在页面的错误条里，不关闭弹窗之外的状态。
- 顺手修复两处已核实的问题：`MemoryWikiTree` 的 `grouped` 改为 `computed`（点主题筛选时列表不更新）；分组标题补全 13 种真实页面类型：`identity_profile` 主人画像、`identity_preference` 主人偏好、`identity_trait` 性格侧写、`identity_person` 重要人物、`preference` 偏好、`dislike` 不喜欢、`need` 需求、`goal` 目标、`project` 项目、`person` 人物、`topic` 主题、`event` 事件、`routine` 日常。标签放进 044c 建的 `memoryLabels.js`。

**Edges and seam**

- Seam：`memory.test.js`（挂载 `MemoryWikiTree`、`MemoryWikiDetail`）与 `MemoryWikiHomePage.test.js`（`wrapper.vm` 调用）。不新增 seam。
- 改 `MemoryWikiDetail.vue`、`MemoryWikiHomePage.vue`、`MemoryWikiTree.vue`、`memoryLabels.js` 和这两个测试文件。

**Run**

- `npx vitest run src/renderer/components/memory`
- `node tests/services/phase3-memory-e2e.test.mjs`
- `npm run lint`

**Unknowns**

- `MemoryWikiHomePage.test.js` 把 `MemoryWikiTree`、`MemoryWikiDetail` 都 stub 成了 `true`，所以合并的事件接线只能靠 `wrapper.vm` 方法测，不要为此去改它的 stub 设置。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：详情页能把另一页并入当前页，确认前明确告诉主人哪一页会被归档。
2. 先写 Case 1 至 Case 5 的红测试。
3. 把 `MemoryWikiTree` 的 `grouped` 改为 `computed`，补全页面类型标签。
4. 详情页加"合并"按钮和 `merge` 事件。
5. 页面加来源选择、确认弹窗和 `openMerge`、`confirmMerge`、`applyMerge`。
6. 运行第 2 部分的三条命令。
7. 提交：`feat(memory): merge memory pages from the detail view`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 详情页点击"合并" | 触发 `merge` 事件 | `MemoryWikiDetail` |
| 2 | `allPages` 含当前页、一个 `active` 页、一个 `archived` 页；`openMerge()` | 来源候选只含那个 `active` 页 | `MemoryWikiHomePage` |
| 3 | 选来源「茶偏好」、目标「咖啡偏好」后 `confirmMerge(id)` | 确认弹窗文案恰为 `将「茶偏好」合并进「咖啡偏好」，「茶偏好」会被归档。`；此时未调用 `mergePages` | `MemoryWikiHomePage` |
| 4 | `applyMerge()` | 以 `(目标 ID, 来源 ID)` 调用 `mergePages` 一次，随后重新读取列表并选中目标页 | `MemoryWikiHomePage` |
| 5 | `mergePages` 抛错"合并失败" | 页面错误条显示"合并失败" | `MemoryWikiHomePage` |
| 6 | 先挂载 `MemoryWikiTree` 传 2 项，再把 `items` 改成 1 项 | 树里只剩 1 项（修复 `computed`） | `MemoryWikiTree` |
| 7 | `pageType` 为 `identity_profile` 的页面 | 分组标题显示"主人画像" | `MemoryWikiTree` |

确认文案和类型标签就是 Settled 里写死的文字。
