# task-045b 待办与日程的类目管理、排序和表单选类目

## 1. Where this task sits

- **Phase 5 后端已有的能力都能在界面用上**，目标是主人能在界面上管理三域类目、编辑日程、搜索聊天，看到联想话语和关联记忆，不再需要通过对话绕路。
- **本任务推进 R-11 收支、待办、日程的类目能在界面上管理**：把 045a 的共用组件接进待办与日程，补排序，并让创建表单能选类目、列表能显示类目。
- **Starts after**：task-045a 收支页的类目管理。**Waits on**：task-045c 聊天的联想话语与工具结果保留。

## 2. What the developer needs to know

**Read first**

- `electron/backend/todo/routes.js` 与 `schedule/routes.js` 的 `*-categories` 一组 — `GET`（只列启用类目）、`POST`、`PUT /:id`、`POST /:id/restore`、`POST /:id/reorder`（体 `{ sortOrder }`）。
- `electron/backend/todo/service.js` 的 `listCategories` 和 `electron/db.js` 的 `listTodoCategories`（`activeOnly` 默认 `true`）— 停用的类目现在在列表里看不到，所以界面无法恢复它们。
- `src/renderer/components/common/CategoryManager.vue` — 045a 的共用组件。
- `src/renderer/components/todo/TodoForm.vue`、`TodoHomePage.vue`、`TodoList.vue` 及日程对应的三个文件 — 现在表单只有标题（日程另有时间），列表不显示类目。
- `electron/backend/category/mapping.js` — 创建待办或日程时 `categoryId` 与 `categoryName` 怎么被识别。

**Settled**

- 后端：`GET /todo-categories` 和 `GET /schedule-categories` 新增查询参数 `includeInactive=true`，返回全部类目；缺省行为不变（只列启用），因为模型工具和上下文装载依赖它。服务的 `listCategories` 接收 `{ includeInactive }`。
- renderer API 新增（`api/todo.js` 与 `api/schedule.js` 各一套）：`listTodoCategories({ includeInactive })`、`createTodoCategory({ name })`、`updateTodoCategory(id, body)`、`restoreTodoCategory(id)`、`reorderTodoCategory(id, sortOrder)`；日程同名函数把 `Todo` 换成 `Schedule`。
- 两页都加"类目"按钮，打开 `CategoryManager`，`reorderable` 为 `true`。"上移/下移"的实现固定为：与相邻类目交换 `sortOrder`（两次 `reorder` 调用），完成后重新读取。
- 创建表单加一个原生下拉，选项为启用的类目，首项"无类目"；创建请求体带 `categoryId` 和 `categoryName`（无类目时都不带）。
- 列表项在标题旁显示 `categoryName`（有则显示）。
- 新建类目后下拉立即出现该类目（页面在管理操作后重新读取启用类目）。

**Edges and seam**

- Seam：后端用真实 HTTP，新测试文件 `tests/services/category-routes.test.mjs`（写法同 `memory-wiki-routes.test.mjs`）；前端用 `todo.test.js`、`schedule.test.js` 和 `api.test.js`。不新增 seam。
- 改 `todo/service.js`、`schedule/service.js`、两个 `routes.js`、两个 API 文件、两个表单、两个页面、两个列表和上述测试。

**Run**

- `node tests/services/category-routes.test.mjs`
- `npx vitest run src/renderer/components/todo src/renderer/components/schedule src/renderer/api`
- `node scripts/verify-task101-category-management-tools.mjs && node scripts/verify-task124-todo-schedule-human-routes.mjs`
- `npm run lint`

**Unknowns**

- 两个页面测试都把各自的 API 模块整体 mock，新增函数必须加进 mock。
- 如果创建时同时传 `categoryId` 与 `categoryName` 仍被映射成"需要新类目"（`needsNewCategory`），停止并报告，不要改 `mapping.js`。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：待办与日程也能在界面管理类目、排序、创建时选类目，列表显示类目。
2. 先写后端 Case 1、Case 2 的红测试。
3. 改服务与路由支持 `includeInactive`，确认两条命令里的旧脚本仍通过。
4. 加两个 API 文件的函数，并在 `api.test.js` 里断言路径与方法。
5. 先写前端 Case 3 至 Case 7 的红测试，再改表单、列表、页面。
6. 运行第 2 部分的四条命令。
7. 提交：`feat(todo,schedule): manage categories and pick one when creating`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 建 2 个待办类目并停用 1 个；`GET /todo-categories`，再 `GET /todo-categories?includeInactive=true` | 前者 1 个，后者 2 个 | 真实 HTTP |
| 2 | 同样对日程类目 | 同上 | 真实 HTTP |
| 3 | 待办页类目管理触发 `move`（第 2 个上移） | 调用 `reorderTodoCategory` 两次，把两个类目的 `sortOrder` 互换 | `TodoHomePage` |
| 4 | 待办页新建类目 `读书` | 调用 `createTodoCategory({ name: '读书' })`，随后重新读取，表单下拉里出现"读书" | `TodoHomePage` |
| 5 | 在表单选"读书"并提交标题 `看书` | `createTodo` 的请求体含 `title: '看书'`、`categoryId`、`categoryName: '读书'` | `TodoHomePage` |
| 6 | 选"无类目"并提交 | 请求体不含 `categoryId` | `TodoHomePage` |
| 7 | 日程页同样的新建与选择 | 同上，调用 `createSchedule` | `ScheduleHomePage` |
| 8 | 列表项带 `categoryName: '读书'` | 列表显示"读书" | `TodoList` |

类目个数与名称是测试里写死的建数据操作结果。
