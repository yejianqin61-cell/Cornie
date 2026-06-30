# 371-记忆主链Prompt装载矩阵统一策略模块收口

## 1. 任务目标

把 `Cornie-0630-Identity记忆实体模型与页面结构设计.md` 中新增细化的 prompt 装载矩阵正式收口为统一策略模块，避免 `40 / 8 / 5 / 3 / 20` 这类关键边界散落在多个文件中，降低后续维护和回归风险。

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-聊天记录存储与历史归档改造方案.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/agent/contextBuilder.js`
- `electron/backend/agent/wikiContext.js`
- `electron/backend/agent/orchestrator.js`
- `electron/backend/diary/generator.js`
- `electron/backend/observation/service.js`
- `electron/backend/agent/`
- `scripts/`

## 4. 当前问题

当前记忆主链虽然大体遵守了“默认注入少量摘要、细节靠 recall / tool 补查”的原则，但实际边界常量仍分散在多处：

- 主对话 history 裁剪上限在 `orchestrator.js`
- 最近对话摘要上限在 `contextBuilder.js`
- wiki recall 命中日期上限在 `wikiContext.js`
- 观察日志今日摘要 / recall / diary 详情上限部分统一、部分分散

这样会导致：

- 设计稿和代码不容易逐项对齐
- 后续改 1 个数字时容易漏改
- 测试不容易证明“整套矩阵是一致的”

## 5. 目标设计

- 新增统一的 prompt loading policy 模块
- 明确收口以下关键边界：
  - 当日真实对话 history 上限：`40`
  - 最近对话摘要消息上限：`8`
  - 当日观察日志摘要上限：`5`
  - wiki recall 观察补查上限：`3`
  - Cornie 日记观察素材上限：`20`
  - topic / memory / chat recall 相关默认命中上限
- 让主链对这些边界的消费方式一致且可被测试
- 输出一份结构化 policy summary，方便 telemetry / 调试 / 验证脚本使用

## 6. 实现步骤

### Step 1

新增统一策略模块，集中导出主链 prompt 装载矩阵。

### Step 2

让 `contextBuilder / wikiContext / orchestrator / diary` 改为消费统一策略，而不是各自写死数字。

### Step 3

补验证脚本，确认关键入口都引用同一套策略值。

## 7. 测试点

- `orchestrator` history 裁剪上限来自统一策略
- `recentConversationSummary` 上限来自统一策略
- `observation` 摘要 / recall / diary 上限与统一策略一致
- `npm run build` 通过

## 8. 完成标准

- 记忆主链 prompt 装载矩阵形成单一可信来源
- 0630 设计稿里的关键数字边界能在代码中一眼找到
- 回归脚本可验证主链各入口没有边界漂移

## 9. 提交建议

`refactor(agent): centralize prompt loading matrix policy`
