# Cornie 001 DeepSeek模型接入模块改进设计

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | Cornie 001 DeepSeek模型接入模块改进设计 |
| 文件名称 | Cornie-001-DeepSeek模型接入模块-改进设计.md |
| 产品名称 | Cornie（铃湾） |
| 文档编号 | module-001 |
| 文档类型 | 模块改进设计 |
| 文档版本 | V1.0 |
| 文档状态 | 草案 |
| 编写日期 | 2026-06-25 |
| 适用对象 | 研发 |
| 上游文档 | ../../Cornie-0625-模型侧改进设计.md |
| 下游文档 | 002 对话编排模块、003 工具策略层模块 |
| 存放目录 | doc/design/module/001-model-provider/ |

## 2. 模块目标

本模块负责将 Cornie 的模型能力统一切换到 DeepSeek，并彻底移除本地模型作为正式方案的设计假设。

目标：

- 建立 DeepSeek 客户端
- 统一模型调用接口
- 支持 API Key、超时、错误处理、模型名配置
- 为后续 JSON 协议与工具调用提供稳定模型输出基础

## 3. 模块职责

| 职责 | 说明 |
| --- | --- |
| 请求封装 | 向 DeepSeek 发起 chat completion 请求 |
| 响应解析 | 提取文本回复内容 |
| 配置管理 | 读取 API Key、base URL、model、timeout |
| 错误处理 | 处理超时、认证失败、限流、网络错误 |
| 健康检查 | 提供 DeepSeek 接入状态检测 |

## 4. 输入输出

### 4.1 输入

- system prompt
- messages
- timeout
- model name

### 4.2 输出

- 模型原始文本回复
- 错误信息
- 健康状态

## 5. 核心接口建议

```ts
chat(messages, options) => Promise<{ content: string }>
checkHealth() => Promise<{ ok: boolean, reason?: string }>
```

## 6. 配置项

| 配置项 | 说明 |
| --- | --- |
| `DEEPSEEK_API_KEY` | 必填 |
| `DEEPSEEK_BASE_URL` | 默认官方 API |
| `DEEPSEEK_MODEL` | 当前对话模型 |
| `DEEPSEEK_TIMEOUT_MS` | 请求超时 |

## 7. 风险与约束

- 云模型不可避免带来隐私变化
- 网络不可用时无法完成模型调用
- 限流与超时必须有友好兜底

## 8. 落地顺序

1. 新建 DeepSeek 客户端
2. 新增健康检查接口
3. 替换旧对话服务中的模型调用依赖
4. 替换旧日记服务中的模型调用依赖

---

**文档结束**
