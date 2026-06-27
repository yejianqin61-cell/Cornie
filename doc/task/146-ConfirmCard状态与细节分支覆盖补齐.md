# 146 ConfirmCard状态与细节分支覆盖补齐

## 1. 任务目标

补齐 `ConfirmCard.vue` 的标题解析、细节构造、状态展示和按钮禁用逻辑测试，提升这个高分支密度小组件的覆盖率，为 `8.5` 向 `95%+` 目标继续推进。

## 2. 任务来源

- `doc/Cornie-013-当前项目完成度复评与后续行动建议.md` 第 `8.5` 节
- `doc/acceptance/8.5-前端测试脚手架与回归模块阶段进展验收.md`
- `coverage/frontend/coverage-summary.json`

## 3. 前置依赖

- `137` 已完成
- `145` 已完成

## 4. 涉及范围

- `src/renderer/components/ConfirmCard.vue`
- `tests/frontend/confirm-card.test.mjs`
- `doc/acceptance/8.5-前端测试脚手架与回归模块阶段进展验收.md`

## 5. 当前问题

当前 `ConfirmCard.vue` 覆盖率仍偏低：

- Statements `74.28%`
- Branches `62.29%`
- Functions `75.00%`
- Lines `78.57%`

现有测试只覆盖了类目新建确认和失败态，尚未覆盖推荐映射确认、自定义标题、payload 细节回退、approved / rejected / processing 状态文本等分支。

## 6. 目标设计

- 补齐不同请求类型下的标题与细节分支
- 补齐 approved / rejected / processing / failed / pending 的状态展示与按钮禁用
- 补齐 payload / arguments 自动展开细节的兜底逻辑

## 7. 实现步骤

### Step 1

为类目映射确认、自定义工具名确认、payload 兜底确认分别编写用例。

### Step 2

补齐各状态下的提示文案和按钮禁用行为测试。

### Step 3

复跑组件单测、前端全量回归与覆盖率，并更新 `8.5` 阶段验收文档。

## 8. 测试点

- `category_mapping_confirmation` 会正确渲染推荐类目、候选类目和触发工具
- `title`、`tool_name`、`toolName`、默认标题分支能被覆盖
- `payload` / `arguments` 对象会被自动展开成细节列表
- `approved` / `rejected` / `processing` / `failed` 状态文案正确
- 非 `pending` 状态下按钮禁用，`pending` 状态下允许触发事件

## 9. 完成标准

- `ConfirmCard.vue` 分支覆盖率较当前基线显著提升
- 新增测试稳定通过，不影响现有前端回归

## 10. 交付物

- 补充后的 `ConfirmCard` 测试
- 更新后的 `8.5` 阶段验收文档

---

**文档结束**
