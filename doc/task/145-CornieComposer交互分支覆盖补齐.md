# 145 CornieComposer交互分支覆盖补齐

## 1. 任务目标

补齐 `CornieComposer.vue` 的关键交互测试，重点覆盖眨眼预览、随机眨眼切换、眼睛覆盖层拖拽、尺寸调整、棋盘底开关与导出复制分支，显著提升当前最低的一组前端函数覆盖率。

## 2. 任务来源

- `doc/Cornie-013-当前项目完成度复评与后续行动建议.md` 第 `8.5` 节
- `doc/acceptance/8.5-前端测试脚手架与回归模块阶段进展验收.md`
- `coverage/frontend/coverage-summary.json`

## 3. 前置依赖

- `136`、`137`、`139`、`142` 已完成

## 4. 涉及范围

- `src/renderer/CornieComposer.vue`
- `tests/frontend/cornie-composer.test.mjs`
- `doc/acceptance/8.5-前端测试脚手架与回归模块阶段进展验收.md`

## 5. 当前问题

当前 `CornieComposer.vue` 覆盖率明显偏低：

- Statements `48.35%`
- Functions `29.03%`
- Lines `50.60%`

现有测试只覆盖静态渲染与一次 JSON 复制，尚未覆盖大部分真实交互路径。

## 6. 目标设计

- 补齐眨眼预览与随机眨眼开关测试
- 覆盖眼睛覆盖层拖拽与尺寸调整
- 覆盖棋盘底切换与输入更新后的导出内容变化
- 覆盖复制 CSS 变量与复制 JSON 两条导出路径

## 7. 实现步骤

### Step 1

为 `cornieBlink` 控制器建立可观测 mock，验证 `blinkNow / start / stop` 调用。

### Step 2

补齐 `CornieComposer.vue` 的拖拽、缩放、开关、输入与复制交互测试。

### Step 3

复跑该文件测试、前端全量测试与覆盖率，更新 `8.5` 阶段验收文档。

## 8. 测试点

- 点击“眨眼预览”会调用一次即时眨眼
- 点击“开启随机眨眼 / 关闭随机眨眼”会调用 `start / stop`
- 拖拽眼睛覆盖层会更新导出 JSON 中的位置
- 拖拽缩放手柄会更新导出 JSON 中的宽高
- 切换棋盘底、修改数值输入后，页面状态与导出内容同步更新
- “复制 JSON”“复制 CSS 变量”都能调用剪贴板写入

## 9. 完成标准

- `CornieComposer.vue` 的函数与行覆盖率显著高于当前基线
- 新增测试稳定通过，不引入其他前端回归失败

## 10. 交付物

- 新增后的 `CornieComposer` 交互测试
- 更新后的 `8.5` 阶段验收文档

---

**文档结束**
