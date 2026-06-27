# 155-ChatHistory与cornieBlink剩余边界覆盖补齐

## 1. 任务目标

在 `8.5 前端测试脚手架与回归模块` 内，继续补齐 `ChatHistory.vue` 与 `cornieBlink.js` 的剩余低覆盖边界测试，重点处理月份切换、空数组兜底、错误兜底、早退逻辑与停止清理分支，进一步推动整体覆盖率。

本任务完成后仍需根据真实 coverage 判断是否继续停留在 `8.5`，不得提前进入 `8.6`。

## 2. 背景与现状

根据当前 `coverage/frontend/coverage-summary.json`：

- `ChatHistory.vue`
  - Statements：`92.72%`
  - Branches：`75.86%`
  - Functions：`86.66%`
  - Lines：`92.3%`
- `cornieBlink.js`
  - Statements：`93.47%`
  - Branches：`73.33%`
  - Functions：`100%`
  - Lines：`100%`

这两个文件都不大，但分支覆盖偏低，属于“单位投入产出比高”的热点。

## 3. 开发范围

涉及文件：

- `tests/frontend/chat-history.test.mjs`
- `tests/frontend/cornie-blink.test.mjs`
- `doc/acceptance/8.5-前端测试脚手架与回归模块阶段进展验收.md`

必要时增强测试 mock，但不修改业务功能语义。

## 4. 具体开发项

### 4.1 ChatHistory

补测试覆盖以下行为：

1. 月份切换后，若当前选中日期不在新列表中，则自动切到列表第一天
2. `entries` 缺失或为空时走 `[]` 兜底
3. `messages` 缺失时走 `[]` 兜底
4. 异常对象没有 `message` 时走 `String(error)` 兜底
5. `loadingDates / loadingMessages` 状态文案分支

### 4.2 cornieBlink

补测试覆盖以下行为：

1. `blinkNow` 在 `stopped` 状态下直接返回
2. `blinkNow` 在已经 `blinking` 时直接返回
3. `blinkSequence` 第一次眨眼后若已 `stopped`，不进入 double blink
4. `start` 后立即 `stop` 且 `timer` 存在时正确清理
5. `stop` 在 `timer` 为空时也可安全执行

## 5. 验收标准

1. 新增测试全部通过
2. `npm.cmd run test:frontend` 通过
3. `npm.cmd run test:frontend:coverage` 通过
4. `ChatHistory.vue` 与 `cornieBlink.js` 覆盖率较任务前有可见提升
5. 更新 `8.5` 阶段验收文档中的测试结果与覆盖率记录

## 6. 备注

若本任务完成后总体覆盖率仍未达到 `95%+`，则继续留在 `8.5`，优先处理 `App.vue` 与 `MemoryWikiWorkspace.vue` 的剩余热点。
