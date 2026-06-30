# 394-旧memory工具兼容口子彻底收口

## 1. 任务目标

根据以下设计稿：

- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`
- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`

在 `393` 完成后，观察日志升级候选已经能正式落到 Identity-Wiki。  
但当前仓库里仍存在一个不一致点：

- `memory_entries` 旧表虽然已不在主对话链路中承担正式长期记忆主源
- 但 `electron/backend/memory/tools.js` 仍然可以显式注册 `memory.create / memory.search / memory.list_active`

这会留下一个误导性的兼容口子，让后续开发误以为旧 `memory.*` 工具仍是合法长期记忆入口。

本任务目标是：

- 彻底收口旧 `memory.*` 工具兼容口子
- 明确 Memory Wiki 才是唯一正式长期记忆工具入口
- 保留旧 `memory_entries` 数据层，避免破坏历史数据

## 2. 任务来源

- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`
- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`

## 3. 涉及范围

- `electron/backend/memory/tools.js`
- `electron/backend/policy/rules.js`
- `scripts/`

## 4. 当前问题

当前主链状态已经是：

- 对话上下文主记忆摘要来自 Wiki / Topic Index
- Identity 正式写入与观察日志升级候选都走 Wiki 体系

但仍有一个残留边界问题：

- 旧 `registerMemoryTools()` 依然能显式注册 `memory.*`
- 旧协议验证脚本里也仍把 `memory.create` 当作合法确认流对象

这与 0630 总纲里“Memory Wiki 成为唯一正式长期记忆主源”不完全一致。

## 5. 目标设计

### 5.1 工具层边界

- 旧 `memory.*` 工具不再允许被注册进运行时工具集
- 长期记忆相关操作统一通过：
  - `memory_wiki.*`
  - `memory_index.*`
  - `memory_governance.*`

### 5.2 策略层边界

- 即使模型仍错误输出 `memory.create` 一类旧工具名
- 策略层也应明确返回：
  - 这是旧长期记忆接口
  - 当前应改用 Memory Wiki 工具集

而不是仅仅给出笼统的“工具未接入”。

### 5.3 数据兼容边界

- 旧 `memory_entries` 表和 `createMemoryService()` 暂时保留
- 仅作为历史数据兼容层
- 不再作为模型可调用的正式长期记忆接口

## 6. 实现步骤

### Step 1

将 `registerMemoryTools()` 收口为不再注册任何运行时工具。

### Step 2

在策略层补一条显式旧接口退场规则：

- 命中 `memory.*`
- 直接 deny
- 提示应切换到 Memory Wiki 工具集

### Step 3

修正仍把 `memory.create` 当作合法路径的验证脚本：

- 协议/策略测试
- 确认流测试

让仓库当前行为与 0630 设计稿一致。

### Step 4

补专项验证脚本证明：

- runtime 不再注册 `memory.*`
- legacy `memory.*` 调用会被明确 deny
- 旧 `memory_entries` 数据兼容层仍可读写

## 7. 测试点

- `registerMemoryTools()` 后工具表中不存在 `memory.*`
- `evaluateToolCalls()` 对 `memory.create` 返回 deny
- deny reason 应明确提示改用 Memory Wiki
- `createMemoryService()` 仍可直接写旧表并查回
- `npm run build` 通过

## 8. 完成标准

- 旧 `memory.*` 工具从运行时正式退场
- Memory Wiki 成为唯一正式长期记忆工具入口
- 旧表只保留为历史兼容数据层

## 9. 提交建议

`refactor(memory): retire legacy memory tools from runtime`
