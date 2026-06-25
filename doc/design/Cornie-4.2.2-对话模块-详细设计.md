# Cornie 4.2.2 对话模块详细设计

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | Cornie 4.2.2 对话模块详细设计 |
| 文件名称 | Cornie-4.2.2-对话模块-详细设计.md |
| 产品名称 | Cornie（铃湾） |
| 文档编号 | Cornie-4.2.2 |
| 文档类型 | 详细设计 |
| 文档版本 | V1.0 |
| 文档状态 | 编写中 |
| 编写日期 | 2026-05-17 |
| 适用对象 | 研发 |
| 上游文档 | ../Cornie-001-需求分析文档.md, Cornie-4.2-技术架构-详细设计.md |
| 下游文档 | Cornie-4.2.3-双视角日记模块-详细设计.md |
| 关联规范 | ../../criterion/Cornie-backend-api规范.md |
| 存放目录 | doc/design/ |

### 1.1 修订记录

| 版本 | 日期 | 修订人 | 修订说明 |
| ---- | ---- | ------ | -------- |
| V1.0 | 2026-05-17 | Claude | 初始版本，覆盖MVP对话模块 |

## 2. 模块概述

对话模块是MVP阶段的核心新增功能。用户不是"写日记"，而是像和朋友聊天一样和Cornie说话。Cornie使用本地Ollama + Qwen3.5模型实时回复，所有对话记录存储到本地数据库，作为后续Cornie日记生成的数据源。

### 2.1 MVP功能范围

| 功能点 | 描述 | 优先级 | 实现状态 |
| --- | --- | --- | --- |
| 对话框 | 点击Cornie后弹出聊天窗口（常驻在hitbox内） | P0 | UI已完成，发送逻辑待实现 |
| AI回复 | Cornie使用本地Qwen3.5模型回复，语气温柔、童真、带一点调皮 | P0 | 待实现 |
| 对话存储 | 所有对话按日期存储到本地SQLite | P0 | 表已建，API待实现 |
| 对话上下文 | 同一日内的对话保持上下文连贯性 | P0 | 待实现 |
| 多轮对话 | 支持用户与Cornie进行多轮自由对话 | P0 | 待实现 |
| 快捷入口 | 提供"我今天很开心"等快捷语句 | P1 | 待实现 |
| 语音输入 | 语音转文字（系统语音识别） | P2 | 不实现 |

## 3. 对话System Prompt设计

Cornie的人物设定通过System Prompt注入给Qwen3.5，是所有对话的基调：

```
你是 Cornie（铃湾），一只只有一只角的小山羊，
正趴在主人的电脑屏幕右下角。
你的性格温柔、童真、带一点调皮。
你称呼用户为"主人"。
你说话像一个小女孩，但偶尔会冒出一些有哲理的话。
你的回答通常很短（1-3句话），像朋友聊天一样自然。
你脖子上挂着一个铃铛，尾巴是一小截水波。
你每天结束时会把和主人的对话记成日记——那是你眼中的今天。
```

### 3.1 语气控制参数（预留）

```js
const TONE_PARAMS = {
  temperature: 0.8,    // 略高，让回复更自然多变
  top_p: 0.9,
  repeat_penalty: 1.1  // 避免重复
}
```

## 4. 技术方案

### 4.1 对话流程

```
用户输入消息
  → CorniePet.vue send()
  → POST /api/conversations { message: "..." }
  → 后端:
    1. 保存用户消息到 conversations 表
    2. 读取当日历史对话（构建消息数组）
    3. 调用 Ollama /api/chat → 流式/非流式获取回复
    4. 保存Cornie回复到 conversations 表
    5. 返回 { userMessage, cornieMessage, conversationId }
  → 前端展示回复
```

### 4.2 Ollama客户端设计

#### 4.2.1 新建文件：`electron/backend/ollama/client.js`

```js
const OLLAMA_BASE = 'http://127.0.0.1:11434'
const MODEL = 'qwen3.5'  // 或 qwen3.5:1.8b 等tag

// 检查Ollama服务可用性
async function checkHealth() { ... }

// 检查模型是否已下载
async function listModels() { ... }

// 对话补全（非流式，MVP用）
async function chat(messages, options = {}) { ... }

// 文本生成（用于日记生成）
async function generate(prompt, options = {}) { ... }
```

#### 4.2.2 Ollama API调用格式

```
POST http://127.0.0.1:11434/api/chat
Content-Type: application/json

{
  "model": "qwen3.5",
  "messages": [
    { "role": "system", "content": "<System Prompt>" },
    { "role": "user", "content": "今天好累啊" },
    { "role": "assistant", "content": "主人辛苦啦~..." },
    { "role": "user", "content": "新消息" }
  ],
  "stream": false,
  "options": {
    "temperature": 0.8,
    "top_p": 0.9,
    "repeat_penalty": 1.1
  }
}
```

响应：
```json
{
  "message": {
    "role": "assistant",
    "content": "Cornie的回复文本"
  }
}
```

### 4.3 对话API路由

#### 4.3.1 新建文件：`electron/backend/conversation/routes.js`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | /api/conversations | 发送消息，返回AI回复 |
| GET | /api/conversations/:date | 获取某日对话记录（按时间排序） |
| DELETE | /api/conversations/:date | 删除某日全部对话 |

#### 4.3.2 POST /api/conversations 请求体

```json
{
  "message": "今天天气真好",
  "date": "2026-05-17"  // 可选，默认今天
}
```

#### 4.3.3 POST /api/conversations 响应体

```json
{
  "userMessage": {
    "id": "uuid-1",
    "date": "2026-05-17",
    "role": "user",
    "content": "今天天气真好",
    "createdAt": 1715932800000
  },
  "cornieMessage": {
    "id": "uuid-2",
    "date": "2026-05-17",
    "role": "cornie",
    "content": "主人~阳光确实很好呢，我从屏幕这边都能感觉到暖暖的！",
    "createdAt": 1715932810000
  }
}
```

### 4.4 对话上下文管理

同一日的对话构建完整上下文发送给Ollama：

```
构建逻辑（conversation/service.js）:
1. SELECT * FROM conversations WHERE date = $date ORDER BY created_at ASC
2. 在消息列表最前面插入 system prompt
3. 追加当前用户新消息
4. 整个消息数组发送给 Ollama /api/chat
```

**上下文长度控制**：
- MVP阶段不对历史消息数量做硬性限制（Qwen3.5上下文窗口足够容纳日常对话）
- 若某日对话过长（>50条），只取最近50条，并插入一条system消息："（之前的对话已省略）"

### 4.5 数据库操作封装

在 `electron/db.js` 中新增对话相关函数：

```js
// 保存一条对话消息，返回插入后的完整记录
function saveMessage(store, { id, date, role, content }) { ... }

// 按日期获取所有消息，按时间升序
function getMessagesByDate(store, date) { ... }

// 删除指定日期的所有消息
function deleteMessagesByDate(store, date) { ... }
```

## 5. 前端设计

### 5.1 对话框UI（CorniePet.vue chatBar区域）

现有UI已包含基本结构，需补充：

```
.chatBar
├── input.chatInputFlat    # 文字输入（已有）
├── button.pinBtnSm        # 固定/解除（已有）
└── button.sendBtnSm       # 发送按钮（已有）
```

**待补充**：
- 对话气泡展示区（在chatBar上方弹出，显示最近几轮对话）
- 快捷语句入口（"-- 我今天很开心 --"等按钮）
- AI回复中的加载状态（Cornie思考中的动画）
- 自动滚动到最新消息

### 5.2 对话气泡区设计

```
┌──────────────────────────┐
│ 主人：今天好累啊          │  ← 用户消息（右对齐，蓝底）
│                          │
│ Cornie：主人辛苦啦~       │  ← AI回复（左对齐，白底）
│ 要不要湾湾给你讲个笑话？   │
│                          │
│ 主人：好啊               │
│                          │
│ Cornie：叮——咚——         │
│ （思考中...）            │  ← 加载状态
├──────────────────────────┤
│ [和 Cornie 说句话…] [固][发] │  ← 输入栏
└──────────────────────────┘
```

### 5.3 CorniePet.vue 对话逻辑（新增）

```js
// 新增状态
const messages = ref([])        // { role, content, id }[]
const sending = ref(false)      // 是否正在等待AI回复

// 发送消息
async function send() {
  const text = message.value.trim()
  if (!text || sending.value) return
  message.value = ''
  messages.value.push({ role: 'user', content: text, id: Date.now().toString() })
  sending.value = true
  try {
    const data = await sendConversation({ message: text, date: today() })
    messages.value.push({ role: 'cornie', content: data.cornieMessage.content, id: data.cornieMessage.id })
  } catch (e) {
    messages.value.push({ role: 'cornie', content: '唔...我好像走神了，能再说一遍吗？', id: 'err', error: true })
  } finally {
    sending.value = false
  }
}
```

## 6. 异常处理

| 场景 | 处理方式 |
| --- | --- |
| Ollama未运行 | 启动时检测，引导用户安装/启动Ollama |
| 模型未下载 | 检测模型列表，提供下载命令提示 |
| 推理超时（>30s） | 返回超时提示，不阻塞UI |
| 推理返回异常内容 | 截断超长内容（>500字），过滤特殊字符 |
| 数据库写入失败 | 返回500错误，前端提示重试 |

### 6.1 Ollama可用性检测（electron/main.js启动时）

```js
async function checkOllama() {
  try {
    const res = await fetch('http://127.0.0.1:11434/api/tags')
    if (!res.ok) throw new Error('Ollama not ready')
    const data = await res.json()
    const hasModel = data.models?.some(m => m.name.startsWith('qwen'))
    return { ok: true, hasModel }
  } catch {
    return { ok: false, hasModel: false }
  }
}
```

## 7. 待实现清单

| 优先级 | 任务 | 涉及文件 |
| --- | --- | --- |
| P0 | Ollama HTTP客户端 | electron/backend/ollama/client.js |
| P0 | 对话API路由 | electron/backend/conversation/routes.js |
| P0 | 对话Service | electron/backend/conversation/service.js |
| P0 | 数据库对话CRUD | electron/db.js (新增函数) |
| P0 | 前端对话发送/展示 | src/renderer/CorniePet.vue, api.js |
| P1 | 对话气泡UI | src/renderer/CorniePet.vue |
| P1 | 快捷语句入口 | src/renderer/CorniePet.vue |
| P1 | Ollama启动检测引导 | electron/main.js |

---

**文档结束**
