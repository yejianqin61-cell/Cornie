# 078 Memory Wiki 工具风险识别与策略接入

## 1. 任务目标

为 `M7 Policy 与确认流模块` 先把 `Memory Wiki` 工具接入现有策略体系，明确只读工具、普通写工具和高风险治理工具的风险识别与默认策略。

## 2. 任务来源

- `doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md` 第 10 节
- `doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md` 第 10.5 节
- `doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md` 第 16.3.7 节 `M7 Policy 与确认流模块`

## 3. 前置依赖

- `M5 工具集增量补全模块` 已完成
- `M6 人类接口集对齐模块` 已完成

## 4. 涉及范围

- `electron/backend/policy/`
- `electron/backend/memory-wiki/`
- `scripts/`

## 5. 当前问题

工具已经接进来了，但 Memory Wiki 高风险动作还没有进入正式策略判断链路。

## 6. 目标设计

本任务完成后应具备：

- Memory Wiki 工具风险识别。
- 只读工具直接放行。
- 高风险写工具进入确认或拦截策略。

## 7. 实现步骤

### Step 1

扩充风险识别规则。

### Step 2

将 Memory Wiki 工具纳入策略判断。

### Step 3

补最小验证脚本。

## 8. 测试点

- 只读工具被识别为低风险。
- 写工具和治理工具被识别为高风险。

## 9. 完成标准

- Memory Wiki 工具进入策略层基础风险识别。

## 10. 交付物

- 策略接入代码
- 对应验证脚本

---

**文档结束**
