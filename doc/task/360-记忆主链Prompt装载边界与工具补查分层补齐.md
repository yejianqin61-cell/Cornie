# 360-记忆主链Prompt装载边界与工具补查分层补齐

## 1. 任务目标

把 0630 三份设计稿里对 prompt 构建边界的最新要求正式落到主链：明确哪些内容默认注入、哪些内容仅摘要注入、哪些内容必须通过工具补查，避免上下文臃肿和层次串位。

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-聊天记录存储与历史归档改造方案.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/agent/contextBuilder.js`
- `electron/backend/agent/wikiContext.js`
- `electron/backend/agent/promptBuilder.js`
- `electron/backend/observation/`
- `scripts/`

## 4. 当前问题

虽然系统已经开始按层装载上下文，但 0630 设计稿明确了更细的边界：

- 当天聊天原文会进入 prompt
- 观察日志只应带固定条数摘要
- 长期记忆应以 Identity 摘要为主
- 更细节的聊天/观察材料应通过工具补查

这些边界需要进一步固化为可验证规则。

## 5. 目标设计

- 固化默认注入层：
  - 当日最近聊天
  - 主身份摘要
  - 条件命中的偏好/人物/trait
  - 今日观察日志少量摘要
- 固化补查层：
  - 历史聊天命中日期
  - 观察日志历史细节
  - Topic 相关来源
- 对每层建立数量预算和降级策略

## 6. 实现步骤

### Step 1

补上下文装载规则与固定预算常量。

### Step 2

补主 prompt 中的层次说明和调试可观测信息。

### Step 3

补回归脚本，验证默认注入与工具补查分层不串位。

## 7. 测试点

- 默认注入不超预算
- 历史聊天与观察日志不会无条件全量进入 prompt
- 命中人物/偏好/trait 时能按需召回

## 8. 完成标准

- Prompt 主链的装载边界与 0630 设计稿对齐

## 9. 提交建议

`refactor(agent): align prompt loading boundaries with memory design`
