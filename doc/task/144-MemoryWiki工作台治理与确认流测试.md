# 144 MemoryWiki 工作台治理与确认流测试

## 1. 任务目标

补齐 `MemoryWikiWorkspace.vue` 的治理详情、主题别名、确认流、巡检与状态流转等关键交互测试。

## 2. 任务来源

- `doc/task/141-工作台剩余高价值交互分支测试.md`
- `coverage/frontend/coverage-summary.json`

## 3. 前置依赖

- `141` 已进入工作台分支补测阶段

## 4. 涉及范围

- `src/renderer/components/MemoryWikiWorkspace.vue`
- `tests/frontend/memory-wiki-workspace-async.test.mjs`

## 5. 当前问题

当前 `MemoryWikiWorkspace` 只覆盖：

- 页面列表初始加载
- 页面详情装载
- 新建页面

仍缺：

- governance 详情展开
- topic alias 保存
- 巡检入池
- confirmation approve / reject
- governance 状态变更

## 6. 目标设计

- 扩展 Memory Wiki mock 数据与 mutation 返回
- 补治理详情和确认流测试
- 提升该页面的函数与分支覆盖

## 7. 实现步骤

### Step 1

扩展 memory wiki mock 支持治理 / topic / confirmation mutation。

### Step 2

补治理与确认流用例。

### Step 3

跑对应前端测试并提交。

## 8. 测试点

- 主题 alias 保存
- 治理详情打开与状态变更
- 巡检入池请求触发
- confirmation 同意 / 拒绝后的状态变化

## 9. 完成标准

- `MemoryWikiWorkspace` 核心治理流进入回归

## 10. 交付物

- 更新后的 Memory Wiki 工作台测试

---

**文档结束**
