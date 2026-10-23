# Cornie Phase 4 工程规则收口简报

**窗口：** 2026-10-23

**基线：** `Cornie-032-Phase3-记忆Demo收口简报.md` 与 `Cornie-028-产品Demo改进施工计划.md` 的 Phase 4。

## 1. Headline

**本轮完成 7 项变更：前端源码、样式、测试和联调契约现在由同一条全量门禁证明。**

| # | 变更 | 位置 | 类型 | 状态 | 对读者的意义 |
|---|---|---|---|---|---|
| C-1 | Phase 4 七份任务简报 | `doc/task/491` 至 `497` | 新增 | 完成 | 工程规则收口有冻结的执行边界 |
| C-2 | Vue 组件质量缝 | `MemoryWikiHomePage` | 修复 | 完成 | 页面有可访问名称，行为测试可重复 |
| C-3 | 模块边界与业务链映射 | `Cornie-033` | 新增 | 完成 | 页面、API、路由和领域服务的责任可查 |
| C-4 | Vue 源码检查接线 | ESLint、Prettier、Stylelint | 变更 | 完成 | SFC 脚本、模板、格式和样式进入检查 |
| C-5 | 组件库与图标警告清理 | PageHeader 与组件测试 | 修复 | 完成 | 前端测试不再输出目标 Vue 警告 |
| C-6 | 唯一全量质量门禁 | `run-tests.mjs` | 新增 | 完成 | 一条命令同时运行前端、后端和契约测试 |
| C-7 | 格式化与表达式稳定性 | `src/renderer` | 修复 | 完成 | 格式化不会再破坏 Vue 事件表达式 |

常规变更：新增 Vue 检查依赖，格式化 82 个前端源码文件，补充架构和 tooling 契约测试。

## 2. What it means

当前前端沿用 Vue 渲染层、renderer API、本地 Express 路由和领域服务四层边界。
新增业务链按聊天、日常业务、记录和记忆演示四类复用已有 API 与服务，不再通过页面旁路后端。

`npm run test:full` 已成为唯一全量入口。
本轮验证包含前端 13 个测试文件的 114 个测试、后端服务与契约测试、架构契约、tooling 契约和既有 verify runner。
`npm run build` 也已通过。

## 3. Still open

- ESLint 仍显示 2 个既有的未使用禁用指令 warning，当前不影响退出码。
- `src/renderer/api/client.js` 及 `Cornie-027`、`Cornie-028` 仍是用户未提交改动，本轮没有纳入提交。
- Phase 5 的干净 Windows 安装、重启恢复、Demo 隔离和发布检查仍未验证，因此产品尚不能称为可分发安装包。
