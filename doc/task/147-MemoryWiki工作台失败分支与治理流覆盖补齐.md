# 147 MemoryWiki工作台失败分支与治理流覆盖补齐

## 1. 任务目标

补齐 `MemoryWikiWorkspace.vue` 的失败分支、治理状态切换、版本回滚、确认拒绝与确认失败等高价值交互测试，继续压缩当前前端最大低覆盖来源。

## 2. 任务来源

- `doc/Cornie-013-当前项目完成度复评与后续行动建议.md` 第 `8.5` 节
- `doc/acceptance/8.5-前端测试脚手架与回归模块阶段进展验收.md`
- `coverage/frontend/coverage-summary.json`

## 3. 前置依赖

- `144` 已完成
- `146` 已完成

## 4. 涉及范围

- `src/renderer/components/MemoryWikiWorkspace.vue`
- `tests/frontend/memory-wiki-workspace-async.test.mjs`
- `doc/acceptance/8.5-前端测试脚手架与回归模块阶段进展验收.md`

## 5. 当前问题

当前 `MemoryWikiWorkspace.vue` 仍是前端覆盖率最低的大型页面之一：

- Statements `75.59%`
- Branches `66.66%`
- Functions `70.68%`
- Lines `76.25%`

现有测试主要覆盖了正常读取、新建页面、主题别名保存、巡检入池、治理批准和确认同意流，尚未覆盖异常失败、治理驳回/稍后再看、版本回滚、归档恢复、确认拒绝、确认失败等路径。

## 6. 目标设计

- 补齐 Memory Wiki 工作台的高风险与失败交互测试
- 覆盖治理详情不同状态按钮路径
- 覆盖确认中心的 reject / failed 状态回写
- 覆盖页面归档、恢复、版本回滚入口

## 7. 实现步骤

### Step 1

扩展 fetch mock，支持治理拒绝、确认拒绝、确认失败、详情读取失败等测试场景。

### Step 2

补齐归档、恢复、版本回滚、治理 deferred / rejected、确认 reject / failed 分支测试。

### Step 3

复跑该页面测试、前端全量回归与覆盖率，并更新 `8.5` 阶段验收文档。

## 8. 测试点

- 页面详情读取失败时会展示可读错误
- 页面支持归档、恢复和版本回滚入口
- 治理请求支持 `approved / deferred / rejected` 状态切换
- 确认中心支持 reject，且失败时能展示错误文案
- 过滤器切换与空态文案保持正常

## 9. 完成标准

- `MemoryWikiWorkspace.vue` 覆盖率较当前基线显著提升
- 新增测试稳定通过，不影响现有前端回归

## 10. 交付物

- 补充后的 Memory Wiki 工作台测试
- 更新后的 `8.5` 阶段验收文档

---

**文档结束**
