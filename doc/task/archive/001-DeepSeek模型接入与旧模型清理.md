# 001 DeepSeek模型接入与旧模型清理

## 1. 任务目标

将 Cornie 的模型调用主链路从本地 `Ollama / qwen3.5` 切换为 `DeepSeek`，并清理现有代码、配置和文档中把本地模型视为正式方案的部分。

本任务完成后：

- 对话调用使用 DeepSeek
- Cornie 日记生成调用使用 DeepSeek
- 后端不再以 `electron/backend/ollama/client.js` 作为正式主链路依赖
- 前端状态检测不再围绕 Ollama

## 2. 任务来源

- `doc/design/Cornie-0625-模型侧改进设计.md`
- `doc/design/module/001-model-provider/Cornie-001-DeepSeek模型接入模块-改进设计.md`

## 3. 前置依赖

无

## 4. 涉及文件

### 4.1 现有文件

- `electron/backend/ollama/client.js`
- `electron/backend/conversation/service.js`
- `electron/backend/diary/service.js`
- `electron/server.js`
- `src/renderer/App.vue`
- `src/renderer/api.js`
- `package.json`
- `doc/design/Cornie-4.2.2-对话模块-详细设计.md`

### 4.2 建议新增文件

- `electron/backend/model/deepseek/client.js`
- `electron/backend/model/config.js`

### 4.3 建议删除或降级的文件

- `electron/backend/ollama/client.js`
  - 可暂时保留文件，但不再被主链路引用

## 5. 设计约束

- 只支持 DeepSeek，不保留运行时模型切换
- 不引入 OpenAI SDK，优先使用原生 `fetch`
- 模型客户端只负责“请求与响应”，不负责 JSON 协议解析
- API Key 不写入仓库，必须从环境或本地配置读取

## 6. 目标结构

### 6.1 模块职责

`electron/backend/model/deepseek/client.js`

- `chat(messages, options)`：用于普通对话
- `generate(prompt, options)`：用于 Cornie 日记生成
- `checkHealth()`：用于检查配置与接口可达性

`electron/backend/model/config.js`

- 统一读取：
  - `DEEPSEEK_API_KEY`
  - `DEEPSEEK_BASE_URL`
  - `DEEPSEEK_MODEL`
  - `DEEPSEEK_TIMEOUT_MS`

## 7. 接口定义

### 7.1 内部接口：chat

```ts
type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ChatOptions = {
  model?: string
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
}

async function chat(messages: ChatMessage[], options?: ChatOptions): Promise<{
  content: string
}>
```

### 7.2 内部接口：generate

```ts
type GenerateOptions = {
  model?: string
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
}

async function generate(prompt: string, options?: GenerateOptions): Promise<{
  content: string
}>
```

### 7.3 内部接口：checkHealth

```ts
async function checkHealth(): Promise<{
  ok: boolean
  reason?: string
}>
```

## 8. 外部接口变更

### 8.1 `GET /api/ollama/status`

当前接口建议废弃，替换为：

### 8.2 新接口：`GET /api/model/status`

响应建议：

```json
{
  "ok": true,
  "provider": "deepseek",
  "model": "deepseek-xxx",
  "configured": true
}
```

失败示例：

```json
{
  "ok": false,
  "provider": "deepseek",
  "configured": false,
  "reason": "missing_api_key"
}
```

## 9. 实现步骤

### Step 1

新增 `electron/backend/model/config.js`

- 读取环境配置
- 做默认值处理
- 缺少 `DEEPSEEK_API_KEY` 时返回可识别错误

### Step 2

新增 `electron/backend/model/deepseek/client.js`

- 封装 `fetch`
- 支持超时
- 统一处理：
  - 401/403
  - 429
  - 5xx
  - network error

### Step 3

改造 `electron/backend/conversation/service.js`

- 将 `../ollama/client.js` 替换为新的 DeepSeek 客户端
- 暂时只替换“普通文本回复”能力，不在本任务内接入工具调用

### Step 4

改造 `electron/backend/diary/service.js`

- 替换日记生成调用
- 保持旧 prompt 大致不变，只替换模型调用底层

### Step 5

改造 `electron/server.js`

- 删除或停用 `/api/ollama/status`
- 增加 `/api/model/status`

### Step 6

改造 `src/renderer/api.js`

- 新增 `getModelStatus()`
- 移除 `getOllamaStatus()`

### Step 7

改造 `src/renderer/App.vue`

- 替换原有 Ollama 提示文案
- 改成 DeepSeek 配置/可用性提示

### Step 8

更新文档

- 旧设计文档中注明 Ollama/Qwen 为历史方案

## 10. 测试点

### 10.1 单元测试建议

- 缺少 API Key 时 `checkHealth()` 返回 `configured=false`
- 超时能返回统一错误
- 非 2xx 响应能返回可识别错误原因

### 10.2 联调测试

- 前端打开后可正确展示模型状态
- 聊天可返回 DeepSeek 回复
- Cornie 日记生成可返回 DeepSeek 生成结果

### 10.3 手工验收步骤

1. 配置 `DEEPSEEK_API_KEY`
2. 启动应用
3. 检查状态栏不再提示 Ollama
4. 发送一条聊天消息，确认返回内容正常
5. 触发一次 Cornie 日记生成，确认成功

## 11. 完成标准

- 主链路不再依赖 `ollama/client.js`
- 前端可查看 DeepSeek 状态
- 对话与日记生成均可通过 DeepSeek 正常工作
- 文档明确 DeepSeek 是唯一模型方案

## 12. 注意事项

- 本任务只做模型提供方切换，不处理工具调用
- 不在本任务内处理 JSON 协议
- 不在本任务内处理长期记忆、类目、待办等上下文装载

---

**文档结束**
