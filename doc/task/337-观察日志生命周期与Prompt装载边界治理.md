# 337-观察日志生命周期与Prompt装载边界治理

## 1. 任务目标

落实观察日志“按天归档、不清空、只高频装载今日内容、历史内容按需补查”的治理规则，并收口当前 prompt 中观察日志的读取边界。

## 2. 任务来源

- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/observation/service.js`
- `electron/backend/agent/contextBuilder.js`
- `electron/backend/agent/wikiContext.js`
- `electron/backend/diary/generator.js`
- `src/renderer/components/ObservationList.vue`

## 4. 当前问题

当前系统已经按日期存储观察日志，但：

- prompt 中读入条数与优先级策略较分散
- 聊天与日记生成对观察日志装载规则未形成统一说明
- 历史观察日志是否默认参与注入的边界仍不够清楚

## 5. 目标设计

- 聊天 prompt 默认只带当天摘要
- Cornie 日记生成仍读当天较完整观察日志
- 历史观察日志不默认全量装载
- 历史内容通过工具和主题索引按需补查

## 6. 实现步骤

### Step 1

统一聊天 / diary / wikiContext 的观察日志读取常量与注释表达。

### Step 2

为观察日志读取策略补充结构化说明或辅助方法。

### Step 3

在前端观察日志入口体现“按天归档”的认知。

## 7. 测试点

- 聊天 prompt 不会带全部历史观察日志
- Cornie 日记可继续读取当天足量观察日志
- 历史观察日志可被按需读取

## 8. 完成标准

- 观察日志生命周期规则在代码中有明确落点
- Prompt 装载边界清晰可验证

## 9. 提交建议

`refactor(observation): govern prompt loading boundaries`

