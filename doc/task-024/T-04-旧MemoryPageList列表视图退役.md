# T-04 旧 MemoryPageList 列表视图退役（Retire Legacy List View）

## 背景

Cornie-024 ID-1/ID-3：双栏容器（T-02）取代 MemoryPageList 后，`MemoryPageList`（类型 Tab + 分页列表，R-05 产物）不再作为前台「记忆 Wiki」入口；`memory-list`/`memory-detail`/`memory-create` 子视图切换由容器内选中取代。

## 目标

1. App.vue 的 memory mode 完全走双栏容器，移除 MemoryPageList 挂载与相关子视图切换。
2. 相关测试适配/移除（memory-page-list-browse 的类型 Tab/分页用例、memory-page-user-flow 的 MemoryPageList 分组用例）。
3. 组件文件处理：MemoryPageList 若全仓无引用则删除（并入未引用组件扫描清理），或保留为内部组件（由容器局部使用）——以实际引用为准。

## 范围

- `src/renderer/App.vue`（memory mode 视图结构）
- `src/renderer/components/MemoryPageList.vue`（退役/删除）
- `tests/frontend/memory-page-list-browse.test.mjs`（移除或改写）
- `tests/frontend/memory-page-user-flow.test.mjs`（MemoryPageList 分组用例适配）
- `scripts/scan-unused-components.mjs`（若删除，扫描应通过）

## 设计要求

### 1. 引用收敛

- grep 全仓 `MemoryPageList` 引用：仅 App.vue（memory mode）与测试。容器（T-02）内部不使用列表页。
- 若 T-02 需要"搜索结果平铺"，由树组件搜索态（T-03）实现，不复用 MemoryPageList。

### 2. 测试迁移

- memory-page-list-browse.test.mjs：类型 Tab/分页/加载更多用例删除或改写为树场景（T-01/T-02 覆盖）。
- memory-page-user-flow 的 MemoryPageList 分组用例：若 MemoryPageList 删除则移除；分组展示语义由树目录覆盖。
- 保留详情两态（MemoryPageDetail）全部用例。

### 3. 组件清理

- 删除 MemoryPageList.vue 后跑 `node scripts/scan-unused-components.mjs` 通过（无未引用组件）。
- 若因任何原因保留文件，须有实际引用（不保留死文件）。

## 验收标准

1. memory mode 打开即双栏容器；无 MemoryPageList 挂载；子视图切换移除。
2. 前端测试全绿（适配后）；`scripts/scan-unused-components.mjs` 通过（若删除组件）。
3. 提交为 `refactor(frontend): ...` 单提交，符合 commit 规范。

## 依赖

- T-02（容器上线后退役，避免空窗）；T-03（搜索覆盖原列表的浏览诉求）。
