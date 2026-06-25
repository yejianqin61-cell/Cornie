# Cornie 004 JSON协议与工具网关模块改进设计

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | Cornie 004 JSON协议与工具网关模块改进设计 |
| 文件名称 | Cornie-004-JSON协议与工具网关模块-改进设计.md |
| 产品名称 | Cornie（铃湾） |
| 文档编号 | module-004 |
| 文档类型 | 模块改进设计 |
| 文档版本 | V1.0 |
| 文档状态 | 草案 |
| 编写日期 | 2026-06-25 |
| 适用对象 | 研发 |
| 上游文档 | ../../Cornie-0625-模型侧改进设计.md |
| 下游文档 | 各业务工具模块 |
| 存放目录 | doc/design/module/004-tool-gateway-json/ |

## 2. 模块目标

本模块负责两件事：

- 解析模型返回的手写 JSON 协议
- 将通过策略层的 tool_call 分发到具体业务工具

## 3. 支持的协议类型

| type | 说明 |
| --- | --- |
| `reply` | 普通回复 |
| `tool_call` | 工具调用请求 |
| `tool_result` | 工具执行结果回传给模型 |

## 4. 模块职责

| 职责 | 说明 |
| --- | --- |
| JSON 解析 | 支持纯 JSON、代码块 JSON、修复重试 |
| Schema 校验 | 校验结构完整性 |
| 工具路由 | 根据 `tool_name` 分发 |
| 结果标准化 | 统一返回 `tool_result` |

## 5. 核心输出

```ts
{
  type: 'reply' | 'tool_call',
  assistantReply?: string,
  toolCalls?: Array<{ tool_name: string, arguments: unknown }>
}
```

---

**文档结束**
