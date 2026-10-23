# 492 Phase 4 前端规范与架构边界

## 1. Where this task sits

- **Phase 4 工程规则与当前产品一致**：目标是工程规则准确描述当前 Vue、Electron 和领域 API 架构。
- 本任务把现有边界写成可执行的开发约定，避免页面绕过渲染进程 API 直接调用后端。
- **开始前**：任务 491 完成。**等待它**：任务 493 至 497 使用同一边界。

## 2. What the developer needs to know

**Read first**

- `src/renderer/api/` — 渲染进程请求和响应的唯一边界。
- `src/renderer/App.vue` — 页面装配和导航位置。
- `electron/server.js` — 本地 HTTP 路由注册方式。
- `electron/backend/` — 领域服务和持久化边界。
- `doc/Cornie-027-当前项目四维评估简报.md` — 当前架构缺口和验收语句。

**Settled**

- 组件只调用渲染进程 API；API 模块负责 HTTP 形状转换。
- 路由调用领域服务；领域服务负责业务规则和持久化。
- 本任务不迁移路由、不引入全局状态库、不重做组件库。

**Edges and seam**

- 接缝是现有组件、`src/renderer/api` 与 `/api` 路由之间的调用边界。
- 只记录并验证当前边界，不扩展业务链。

**Run**

- `npm run lint`
- `npm run test:full`

**Unknowns**

- 若发现页面直连后端的历史例外，先确认是否属于本阶段契约；不在未定规则下批量改写。

## 3. The workflow

1. 阅读第 2 部分，复述：页面、API、路由和领域服务各守一条边界。
2. 从现有调用搜索出一条真实业务链并记录其边界事实。
3. 写一条可失败的边界检查或最小约定示例。
4. 用现有调用模式修正唯一违反边界的窄点。
5. 写入架构约定文档并标明错误在何处转换。
6. 运行 lint、全量门禁并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 页面读数据 | 组件加载 | 只经 renderer API 取数 | `src/renderer/api` |
| API 错误 | 后端返回错误 | API 保留结构化错误 | API 边界 |
| 路由调用 | HTTP 请求 | 路由调用领域服务 | `/api` 路由 |
| 领域失败 | 服务拒绝写入 | UI 获得可翻译错误 | UI 错误边界 |
| 规则文档 | 新增业务链 | 指向已有边界和复用点 | 架构约定 |
