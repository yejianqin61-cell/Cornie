# Cornie 4.2.3 双视角日记模块详细设计

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | Cornie 4.2.3 双视角日记模块详细设计 |
| 文件名称 | Cornie-4.2.3-双视角日记模块-详细设计.md |
| 产品名称 | Cornie（铃湾） |
| 文档编号 | Cornie-4.2.3 |
| 文档类型 | 详细设计 |
| 文档版本 | V1.0 |
| 文档状态 | 编写中 |
| 编写日期 | 2026-05-17 |
| 适用对象 | 研发 |
| 上游文档 | ../Cornie-001-需求分析文档.md, Cornie-4.2-技术架构-详细设计.md, Cornie-4.2.2-对话模块-详细设计.md |
| 下游文档 | - |
| 关联规范 | ../../criterion/Cornie-backend-api规范.md |
| 存放目录 | doc/design/ |

### 1.1 修订记录

| 版本 | 日期 | 修订人 | 修订说明 |
| ---- | ---- | ------ | -------- |
| V1.0 | 2026-05-17 | Claude | 初始版本，覆盖MVP双视角日记模块 |

## 2. 模块概述

双视角日记是Cornie的核心差异化功能。MVP阶段的核心洞察是：**Cornie日记不是基于用户写的日记文本生成，而是基于用户与Cornie的对话内容自动生成**。用户甚至不需要写传统日记——只需和Cornie聊天，Cornie就能在每天结束时自动生成一篇"Cornie视角的日记"。

### 2.1 MVP功能范围

| 功能点 | 描述 | 优先级 | 实现状态 |
| --- | --- | --- | --- |
| Cornie日记自动生成 | 基于当日对话内容，调用Ollama生成Cornie视角日记 | P0 | 待实现（目前为占位文本） |
| 生成规则 | 第一人称，50-150字，温柔童真语气 | P0 | 待实现 |
| 用户日记 | 用户可额外撰写传统日记（纯文本），可为空 | P0 | 已完成 |
| 日记存储 | 以日期为key，关联对话记录 | P0 | 已完成 |
| 日记查看 | 主窗口日历视图查看，切换"我的日记"和"Cornie日记" | P1 | 已完成（基础版） |
| 日记编辑 | 用户可编辑Cornie生成的日记 | P1 | 待实现 |
| 重新生成 | 用户可点击重新生成Cornie日记 | P0 | UI已完成，后端为占位 |

## 3. 数据模型

### 3.1 diary_entries 表（已建）

```sql
CREATE TABLE diary_entries (
  date       TEXT PRIMARY KEY,    -- '2026-05-17'
  user_text  TEXT,                -- 用户日记（可空）
  cornie_text TEXT,               -- Cornie日记（AI生成）
  updated_at INTEGER NOT NULL     -- Unix毫秒时间戳
);
```

### 3.2 与对话记录的关联

日记通过`date`字段与`conversations`表隐式关联：

```
同一天的记录:
  diary_entries.date = conversations.date

Cornie日记生成流程:
  1. 读取 conversations WHERE date = '2026-05-17'
  2. 提取所有对话内容
  3. 发送给Ollama生成日记
  4. 写入 diary_entries.cornie_text
```

## 4. Cornie日记生成

### 4.1 生成触发时机

| 触发方式 | 说明 | 优先级 |
| --- | --- | --- |
| 手动触发 | 用户在主窗口点击"生成Cornie日记" | P0 |
| 对话结束后自动触发 | 每天最后一次对话结束5分钟后自动生成 | P1 |
| 每日定时触发 | 每天固定时间（如22:00）检查是否有对话但无日记 | P1 |

### 4.2 生成Prompt设计

```
你是一只叫Cornie的独角山羊，正在写今天的日记。
以下是主人今天和你的所有对话记录：

---
{conversation_text}
---

请以Cornie的第一人称视角，写一篇今天的日记（50-150字）。
要求：
- 语气温柔、童真，像一个小女孩在记录今天发生的事
- 总结今天主人聊了什么、主人的情绪如何
- 写写Cornie自己的感受
- 不要编造对话中不存在的内容
- 如果对话很少或没有对话，写："今天主人很安静呢，我就一直趴在屏幕角落陪着。希望主人明天开心。"
```

### 4.3 生成Service实现（diary/service.js 新增）

```js
async function generateCornieDiary({ date }) {
  // 1. 读取当日对话
  const messages = getMessagesByDate(store, date)
  
  // 2. 构建prompt
  let conversationText
  if (messages.length === 0) {
    conversationText = '（今天主人没有和我说话）'
  } else {
    conversationText = messages
      .map(m => `[${m.role === 'user' ? '主人' : 'Cornie'}]: ${m.content}`)
      .join('\n')
  }
  
  const prompt = buildDiaryPrompt(conversationText)
  
  // 3. 调用Ollama生成
  const result = await ollamaClient.generate(prompt, {
    temperature: 0.7,
    max_tokens: 300
  })
  
  // 4. 存储
  return setCornieText(store, { date, cornieText: result.trim() })
}
```

### 4.4 重新生成

用户点击"重新生成"时：
1. 调用相同的生成逻辑（使用相同对话记录）
2. 通过`temperature: 0.7`确保每次生成结果有自然变化
3. 覆盖原有`cornie_text`

### 4.5 无对话时的处理

如果当日没有任何对话记录，且用户也没有写用户日记，Cornie日记生成时使用默认文案：

> "今天主人很安静呢，我就一直趴在屏幕角落陪着。希望主人明天开心。"

如果用户写了用户日记但没有对话，Cornie基于用户日记生成：

```
以Cornie的第一人称视角，根据主人今天的日记内容，写一篇回应日记（50-150字）。
主人今天的日记：{user_text}
```

## 5. API设计

### 5.1 已有接口（保持不变）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /api/entries | 列出日记条目 |
| GET | /api/entries/:date | 获取某天日记 |
| PUT | /api/entries/:date | 保存用户日记 |
| POST | /api/entries/:date/regenerate-cornie | 重新生成Cornie日记 |

### 5.2 新增需求

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | /api/entries/:date/generate-cornie | 首次生成Cornie日记 |
| PUT | /api/entries/:date/cornie-text | 编辑Cornie日记文本 |

**PUT /api/entries/:date/cornie-text 请求体**：
```json
{
  "cornieText": "用户编辑后的文本"
}
```

### 5.3 regenerate-cornie 与 generate-cornie 区别

- `POST /generate-cornie`：基于对话内容首次生成（若cornie_text已有值则覆盖）
- `POST /regenerate-cornie`：重新生成（逻辑相同，语义区分用于前端提示）
- 两者可合并为一个接口，通过行为统一处理

## 6. 前端设计（App.vue · 日记模式）

### 6.1 现有UI

当前App.vue的diary模式已实现：
- 左侧日历列表（按月份筛选，显示日期和hasUserText/hasCornieText标签）
- 右侧：我的日记textarea（可编辑）+ Cornie日记textarea（只读）+ 往年今日

### 6.2 MVP阶段改进点

| 改进 | 说明 |
| --- | --- |
| Cornie日记改为可编辑 | textarea去除readonly，新增"编辑Cornie日记"按钮 |
| 首次生成按钮 | 当日无Cornie日记时显示"生成Cornie日记"按钮 |
| 重新生成确认 | 点击重新生成时弹确认框："将覆盖当前Cornie日记，确认？" |
| 生成中状态 | 生成时Cornie日记区域显示加载动画+文案 |
| 生成来源标注 | Cornie日记底部显示"基于X条对话生成"或"基于用户日记生成" |

### 6.3 状态新增

```js
const generating = ref(false)     // Cornie日记生成中
const editingCornie = ref(false)  // 是否在编辑Cornie日记
```

## 7. 待实现清单

| 优先级 | 任务 | 涉及文件 |
| --- | --- | --- |
| P0 | Cornie日记生成Prompt + Service | electron/backend/diary/service.js |
| P0 | 基于对话生成日记（替代占位文本） | electron/backend/diary/service.js |
| P0 | 生成中加载状态UI | src/renderer/App.vue |
| P1 | 编辑Cornie日记功能 | src/renderer/App.vue + API |
| P1 | 自动定时生成日记 | electron/main.js（定时器） |
| P1 | 生成来源标注 | src/renderer/App.vue |

---

**文档结束**
