# R-07 记忆 Wiki-重复 UI 收敛（Consolidate Duplicate Wiki UIs）

## 背景

Cornie-023 §3.2 M7：同一 Wiki 存在两套 UI——前台 `MemoryPageList/MemoryPageDetail`（普通用户翻阅）与高级设置内 `MemoryWikiWorkspace`（`AdvancedSettings.vue:3,58` 挂载的完整工作台：列表/编辑/版本/主题/治理/巡检/审计），平行重复。

## 目标

1. 明确两套 UI 的层级分工：前台为**普通用户翻阅视图**（阅读/编辑自己记忆），MemoryWikiWorkspace 收敛为**治理/高级功能**（版本回滚/主题索引/治理审核/巡检审计/高风险确认）。
2. 消除"同一功能两处入口"的混乱；入口说明同步精简（与 R-09 协同）。

## 范围

- `src/renderer/components/AdvancedSettings.vue`（MemoryWikiWorkspace 入口说明）
- `src/renderer/components/MemoryWikiWorkspace.vue`（如需要：收敛为治理面板集合，编辑页保留但标注高级）
- `src/renderer/components/MemoryPageList.vue`（普通用户视图，与 R-05 册子化对齐）
- 入口/导航文案（R-04/R-09 协同）

## 设计要求

### 1. 分工界定

- **前台（记忆 Wiki 导航入口）**：普通用户的阅读与编辑（R-05/R-06 改造后的列表与详情）。
- **高级设置 → 记忆 Wiki 工作台**：治理能力集合（版本历史/回滚、主题索引、治理待审、巡检结果、审计、高风险确认中心）；"页面编辑"若保留，标注为高级操作或移除（前台已覆盖）。
- 两套入口不出现同一按钮同一功能（如"新建记忆"只在前台）。

### 2. 入口收敛

- 前台导航与高级设置入口都保留，但文案与功能边界清晰（如高级设置入口 hint 改为"记忆治理、版本与审计"）。
- 若 MemoryWikiWorkspace 的列表区与前台重复严重，列表区改为"治理视角列表"（状态/风险导向）或移除，避免双列表。

### 3. 兼容

- MemoryWikiWorkspace 对外接口（AdvancedSettings 引用）不变；治理功能（巡检/审计/确认中心）全量保留。

## 验收标准

1. 前台与高级设置两个入口功能边界清晰：普通编辑/新建只在前台；版本/回滚/治理/巡检/审计只在高级工作台。
2. 无同一按钮在两处出现；入口文案与分工一致。
3. `npx vitest run tests/frontend` 全绿（memory-wiki-workspace-async 测试适配后通过）。
4. 提交为 `refactor(frontend): ...` 单提交，符合 commit 规范。

## 依赖

- R-04/R-05/R-06（前台结构确定后收敛边界）；R-09（文案精简）协同。
