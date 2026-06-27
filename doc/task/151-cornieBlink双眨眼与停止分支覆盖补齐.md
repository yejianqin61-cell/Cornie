# 151 cornieBlink双眨眼与停止分支覆盖补齐

## 1. 任务目标

补齐 `cornieBlink.js` 的双眨眼、停止清理和停止后不再继续调度等剩余分支，提升这个小文件当前偏低的 branch 覆盖率。

## 2. 任务来源

- `doc/Cornie-013-当前项目完成度复评与后续行动建议.md` 第 `8.5` 节
- `doc/acceptance/8.5-前端测试脚手架与回归模块阶段进展验收.md`
- `coverage/frontend/coverage-summary.json`

## 3. 前置依赖

- `139` 已完成
- `145` 已完成
- `150` 已完成

## 4. 涉及范围

- `src/renderer/cornieBlink.js`
- `tests/frontend/cornie-blink.test.mjs`
- `doc/acceptance/8.5-前端测试脚手架与回归模块阶段进展验收.md`

## 5. 当前问题

当前 `cornieBlink.js` 覆盖率整体不算低，但 branch 仍明显偏低：

- Statements `89.13%`
- Branches `66.66%`
- Functions `100%`
- Lines `95.00%`

现有测试只覆盖了单次眨眼和最基本的 start/stop，没有覆盖：

- `doubleBlinkChance` 命中时的第二次 blink
- `stop()` 后计时器清理与 head dip 复位
- `stopped` 状态下不再继续调度

## 6. 目标设计

- 补齐双眨眼与停止相关分支
- 验证 stop 后 hideLayers / setHeadDipPx(0) 的清理行为
- 验证 stop 后不会继续 scheduleNext

## 7. 实现步骤

### Step 1

基于 fake timers 和 `Math.random` 可控 mock，精确驱动双眨眼与停止时序。

### Step 2

补齐双眨眼、stop 清理、stop 后不再继续 blink 的断言。

### Step 3

复跑该文件测试、前端全量回归与覆盖率，并更新 `8.5` 阶段验收文档。

## 8. 测试点

- `doubleBlinkChance=1` 时会发生两轮 blink
- `start()` 会先隐藏图层再进入调度
- `stop()` 会清理计时器、隐藏图层并把 head dip 重置为 `0`
- 停止后不再继续触发额外 blink

## 9. 完成标准

- `cornieBlink.js` branch 覆盖率较当前基线显著提升
- 新增测试稳定通过，不影响现有前端回归

## 10. 交付物

- 补充后的 `cornieBlink` 测试
- 更新后的 `8.5` 阶段验收文档

---

**文档结束**
