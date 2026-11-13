# task-045a 收支页的类目管理（含共用的类目管理组件）

## 1. Where this task sits

- **Phase 5 后端已有的能力都能在界面用上**，目标是主人能在界面上管理三域类目、编辑日程、搜索聊天，看到联想话语和关联记忆，不再需要通过对话绕路。
- **本任务推进 R-11 收支、待办、日程的类目能在界面上管理**：先做出三域共用的管理组件，并接进收支页。这是本阶段的 tracer bullet。
- **Starts after**：Phase 4 已收口。**Waits on**：task-045b 待办与日程接入类目管理（复用本任务的组件）。

## 2. What the developer needs to know

**Read first**

- `electron/backend/ledger/routes.js` 的 `/ledger/categories` 一组 — `GET ?type=`（不带 `type` 时包含已停用类目）、`POST /expense`、`POST /income`、`PUT /:id`（`name`、`isActive`、`sortOrder`）、`POST /:id/restore`。
- `src/renderer/api/ledger.js` — 现在只有 `listLedgerCategories`；其余类目函数要补。
- `src/renderer/components/ledger/LedgerHomePage.vue` 与 `LedgerTransactionForm.vue` — 页面怎么读类目并传给记录表单；表单按 `type` 过滤类目按钮。
- `src/renderer/components/common/ConfirmDialog.vue` 和 `PageHeader.vue` — 现有的通用组件风格。
- `src/renderer/components/ledger/ledger.test.js` — 收支页的前端测试写法。

**Settled**

- 共用组件为 `src/renderer/components/common/CategoryManager.vue`，原生输入和按钮，属性：`categories`（数组，元素含 `id`、`name`、`isActive`、`sortOrder`，可含 `type`）、`types`（数组，元素 `{ value, label }`，用于收支的"收入/支出"分栏，缺省为空表示不分栏）、`reorderable`（布尔，缺省 `false`）、`error`（字符串）、`busy`（布尔）。
- 事件固定：`create`（载荷 `{ name, type }`）、`rename`（`{ id, name }`）、`deactivate`（`id`）、`restore`（`id`）、`move`（`{ id, direction }`，`direction` 为 `up` 或 `down`）、`close`。
- 界面文字固定：标题"类目管理"；按钮"新增""改名""停用""恢复""上移""下移"；已停用类目灰显并带"已停用"。停用可逆，不弹确认。
- 收支页有"类目"按钮打开管理浮层，分"支出""收入"两栏。类目接口的名称重复规则来自后端（`category/validation.js`）：与现有类目重复时后端返回已有类目，界面不报错也不重复显示；非法名称返回 400，错误文字显示在 `error`。
- 收支的类目没有 `reorder` 接口，所以收支页不开 `reorderable`；排序留给待办和日程。
- 已核实的现有缺陷：收支页用 `listLedgerCategories()`（不带类型，包含已停用类目）喂给记录表单，所以已停用类目仍会出现在表单里。本任务一并改为表单只收到 `isActive` 的类目；管理浮层收到全部。
- renderer API 新增：`createLedgerCategory(type, { name })`（`type` 为 `expense` 或 `income`）、`updateLedgerCategory(id, body)`、`restoreLedgerCategory(id)`。

**Edges and seam**

- Seam：`ledger.test.js`（`vi.mock('../../api/ledger.js')`，挂载收支页）和 `api.test.js`。组件本身的测试放进新文件 `src/renderer/components/common/CategoryManager.test.js`。不新增 seam。
- 新增 `CategoryManager.vue` 与它的测试；改 `api/ledger.js`、`LedgerHomePage.vue`、`ledger.test.js`、`api.test.js`。

**Run**

- `npx vitest run src/renderer/components/common src/renderer/components/ledger src/renderer/api`
- `npm run lint`

**Unknowns**

- 页面测试把 `../../api/ledger.js` 整体 mock，新增的三个函数必须加进它的 mock 对象，否则别的用例会因 `undefined` 报错，按此处理即可。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：做一个三域共用的类目管理组件，先接进收支页，并让记录表单只看到启用的类目。
2. 先写 `CategoryManager.test.js` 的 Case 1 至 Case 4 红测试。
3. 实现 `CategoryManager.vue`。
4. 在 `api/ledger.js` 加三个函数，并在 `api.test.js` 断言路径与方法。
5. 先写收支页 Case 5 至 Case 7 红测试，再接线：类目按钮、管理浮层、各事件调用 API 后重新读取类目。
6. 把传给记录表单的类目过滤为 `isActive`。
7. 运行第 2 部分的两条命令。
8. 提交：`feat(ledger): manage expense and income categories from the ledger page`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 传入 2 个启用类目和 1 个停用类目 | 三个名称都显示；停用的带"已停用"并只有"恢复"按钮，启用的有"停用" | `CategoryManager` |
| 2 | 在新增输入框填 `宠物`，点"新增" | 触发 `create`，载荷 `{ name: '宠物', type: ... }` | `CategoryManager` |
| 3 | `reorderable` 为 `false` 与 `true` 各挂载一次 | 前者没有"上移""下移"，后者有 | `CategoryManager` |
| 4 | 传入 `error` 为 `名称无效` | 浮层显示该文字 | `CategoryManager` |
| 5 | 收支页收到 3 个类目（其中 1 个 `isActive: false`） | 记录表单收到的 `categories` 只有 2 个；管理浮层有 3 个 | `LedgerHomePage` |
| 6 | 管理浮层触发 `create`（`type: 'expense'`） | 调用 `createLedgerCategory('expense', { name })` 一次，随后重新读取类目 | `LedgerHomePage` |
| 7 | 触发 `deactivate` 与 `restore` | 分别调用 `updateLedgerCategory(id, { isActive: false })` 与 `restoreLedgerCategory(id)` | `LedgerHomePage` |
| 8 | `createLedgerCategory('income', { name: 'x' })` | 请求 `POST /api/ledger/categories/income`，体为 `{ name: 'x' }` | `api.test.js` |

界面文字与事件载荷就是 Settled 里写死的约定，不来自读组件代码。
