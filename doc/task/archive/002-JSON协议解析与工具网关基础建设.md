# 002 JSON协议解析与工具网关基础建设

## 1. 任务目标

建立 Cornie 的手写 JSON 协议解析能力和工具网关基础设施，为后续所有 AI 工具调用提供统一底座。

本任务完成后：

- 模型返回的 `reply / tool_call` 能被稳定解析
- 支持非法 JSON 的一次修复重试
- 工具可以通过统一注册表和统一路由执行
- 工具结果可以标准化回传

## 2. 任务来源

- `doc/design/Cornie-0625-模型侧改进设计.md`
- `doc/design/module/004-tool-gateway-json/Cornie-004-JSON协议与工具网关模块-改进设计.md`

## 3. 前置依赖

- `001-DeepSeek模型接入与旧模型清理.md`

## 4. 涉及文件

### 4.1 现有文件

- `electron/backend/conversation/service.js`
- `electron/backend/validators.js`
- `electron/backend/http/errors.js`

### 4.2 建议新增文件

- `electron/backend/agent/jsonProtocol.js`
- `electron/backend/tools/registry.js`
- `electron/backend/tools/gateway.js`
- `electron/backend/tools/types.js`

## 5. 协议定义

### 5.1 reply

```json
{
  "type": "reply",
  "assistant_reply": "主人，小铃湾听到啦。"
}
```

### 5.2 tool_call

```json
{
  "type": "tool_call",
  "assistant_reply": "我先帮主人记下来。",
  "tool_calls": [
    {
      "tool_name": "ledger.add_expense",
      "arguments": {
        "amount": 28
      }
    }
  ]
}
```

### 5.3 tool_result

```json
{
  "type": "tool_result",
  "results": [
    {
      "tool_name": "ledger.add_expense",
      "ok": true,
      "result": {
        "id": "xxx"
      }
    }
  ]
}
```

## 6. 目标结构

### 6.1 `jsonProtocol.js`

职责：

- 提取模型返回中的 JSON
- 支持三种输入：
  - 纯 JSON
  - Markdown 代码块包裹 JSON
  - 含少量前后噪音文本的 JSON
- 校验协议字段

建议导出：

```ts
parseModelJson(text: string)
buildJsonRepairPrompt(rawText: string)
normalizeToolResult(result: unknown)
```

### 6.2 `registry.js`

职责：

- 维护 `tool_name -> handler` 映射

建议导出：

```ts
registerTool(definition)
getTool(name)
listTools()
```

### 6.3 `gateway.js`

职责：

- 接收通过策略层的 `tool_calls`
- 调用注册工具
- 收集结果
- 返回标准化 `tool_result`

## 7. 数据结构建议

### 7.1 ToolDefinition

```ts
type ToolDefinition = {
  name: string
  description: string
  riskLevel: 'low' | 'medium' | 'high'
  handler: (args: unknown, ctx: ToolContext) => Promise<ToolExecutionResult>
}
```

### 7.2 ToolExecutionResult

```ts
type ToolExecutionResult = {
  ok: boolean
  result?: unknown
  error?: {
    code: string
    message: string
  }
}
```

## 8. 实现步骤

### Step 1

新增 `jsonProtocol.js`

- 实现 JSON 提取
- 实现协议校验
- 对缺失字段、字段类型错误给出统一错误

### Step 2

实现一次修复重试支持

- 当解析失败时，生成“请只输出合法 JSON”的修复 prompt
- 只允许修复一次

### Step 3

新增 `registry.js`

- 支持工具注册
- 支持读取工具定义

### Step 4

新增 `gateway.js`

- 遍历 `tool_calls`
- 按顺序调用 handler
- 汇总 `tool_result`

### Step 5

在 `conversation/service.js` 里预留接入点

- 首轮只要求能识别 `reply` 和 `tool_call`
- 不在本任务内实现业务工具，只实现基础网关

## 9. 测试点

### 9.1 单元测试建议

- 纯 JSON 可解析
- 代码块 JSON 可解析
- 噪音包裹 JSON 可提取
- 非法 JSON 可触发修复 prompt
- 修复失败时返回协议错误

### 9.2 联调测试

- 模型输出 `reply` 时流程正确
- 模型输出单个 `tool_call` 时可进入网关
- 工具 handler 异常时可得到标准化错误

## 10. 完成标准

- `reply / tool_call / tool_result` 三类结构已固定
- 存在统一 JSON 解析器
- 存在统一工具注册与网关层
- 后续业务工具可以直接挂接到注册表

## 11. 注意事项

- 本任务不实现具体业务工具
- 本任务不负责风险确认逻辑
- 协议一旦对外使用，后续变更要谨慎

---

**文档结束**
