# Cornie 4.2 MVP技术架构详细设计

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | Cornie 4.2 MVP技术架构详细设计 |
| 文件名称 | Cornie-4.2-技术架构-详细设计.md |
| 产品名称 | Cornie（铃湾） |
| 文档编号 | Cornie-4.2-arch |
| 文档类型 | 详细设计 |
| 文档版本 | V1.0 |
| 文档状态 | 编写中 |
| 编写日期 | 2026-05-17 |
| 适用对象 | 研发 |
| 上游文档 | ../Cornie-001-需求分析文档.md |
| 下游文档 | Cornie-4.2.1-桌宠模块-详细设计.md, Cornie-4.2.2-对话模块-详细设计.md, Cornie-4.2.3-双视角日记模块-详细设计.md, Cornie-4.2.4-往年今日模块-详细设计.md, Cornie-4.2.5-本地化与隐私模块-详细设计.md |
| 关联规范 | ../../criterion/Cornie-backend-api规范.md |
| 存放目录 | doc/design/ |

### 1.1 修订记录

| 版本 | 日期 | 修订人 | 修订说明 |
| ---- | ---- | ------ | -------- |
| V1.0 | 2026-05-17 | Claude | 初始版本，覆盖MVP阶段整体技术架构 |

## 2. 架构概述

### 2.1 整体分层

```
┌─────────────────────────────────────────────────────┐
│                    Cornie 桌面应用                     │
├─────────────────────────────────────────────────────┤
│  渲染进程 (Renderer)                                  │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │  主窗口 (Vue3) │  │ 桌宠窗 (Vue3) │                 │
│  │  index.html   │  │ cornie.html  │                  │
│  └──────┬───────┘  └──────┬───────┘                  │
│         │ HTTP :5174       │ IPC (drag)              │
├─────────┼──────────────────┼────────────────────────┤
│  主进程 (Electron Main)     │                        │
│  ┌──────┴──────────────────┴──────┐                  │
│  │  Express API Server (:5174)     │                  │
│  │  /api/entries   日记 CRUD       │                  │
│  │  /api/health    健康检查        │                  │
│  └────────┬────────────────────────┘                  │
│           │                                          │
│  ┌────────┴────────┐                                 │
│  │   SQLite (sql.js)│   本地数据库                     │
│  │   diary_entries  │                                  │
│  │   conversations  │                                  │
│  └─────────────────┘                                 │
│                                                      │
│  ┌─────────────────┐                                 │
│  │  Ollama (外部)    │  本地大模型推理                   │
│  │  Qwen3.5         │  HTTP :11434                     │
│  └─────────────────┘                                 │
└─────────────────────────────────────────────────────┘
```

### 2.2 进程模型

| 进程 | 职责 | 技术栈 |
| --- | --- | --- |
| 主进程 (Main) | 窗口管理、Express API、SQLite、IPC、桌面层挂载 | Electron Main, Express, sql.js, C# (via PowerShell) |
| 渲染进程 - 主窗口 | 日记管理界面、往年今日、日历视图 | Vue 3, Vite, CSS |
| 渲染进程 - 桌宠窗口 | Cornie形象展示、眨眼动画、对话框、拖动 | Vue 3, CSS动画, IPC |
| 外部进程 | Ollama本地大模型推理 | Ollama (用户自行安装) |

### 2.3 通信方式

| 通信路径 | 方式 | 用途 |
| --- | --- | --- |
| 渲染进程 → API Server | HTTP (localhost:5174) | 日记CRUD、往年今日查询、对话存储/读取 |
| 渲染进程 → 主进程 | IPC (ipcRenderer.send) | 桌宠窗口拖动（cornie:drag-start/move/end） |
| 主进程 → Ollama | HTTP (localhost:11434) | 对话生成、Cornie日记生成 |
| 主进程API → SQLite | sql.js 同步调用 | 数据读写 |

### 2.4 目录结构

```
Cornie/
├── electron/                    # Electron 主进程
│   ├── main.js                  # 入口：窗口创建、IPC注册、启动API
│   ├── server.js                # Express应用工厂
│   ├── db.js                    # SQLite 连接、迁移、CRUD封装
│   ├── preload.cjs              # preload (CommonJS, 供Electron加载)
│   ├── preload.js               # preload (ESM, 供开发参考)
│   ├── backend/
│   │   ├── diary/
│   │   │   ├── routes.js        # 日记API路由
│   │   │   └── service.js       # 日记业务逻辑
│   │   ├── conversation/        # [待实现] 对话API
│   │   │   ├── routes.js
│   │   │   └── service.js
│   │   ├── ollama/              # [待实现] Ollama客户端
│   │   │   └── client.js
│   │   ├── http/
│   │   │   ├── errors.js        # HttpError类
│   │   │   └── middleware.js    # 错误处理、异步包装
│   │   └── validators.js        # 输入校验
│   └── win32/
│       └── desktopLayer.js      # Windows WorkerW桌面层挂载
├── src/
│   └── renderer/                # 渲染进程 (Vue 3)
│       ├── main.js              # 主窗口入口
│       ├── cornieMain.js        # 桌宠窗口入口
│       ├── App.vue              # 主窗口根组件
│       ├── CorniePet.vue        # 桌宠根组件
│       ├── CornieComposer.vue   # 部件拼装编辑器
│       ├── cornieConfig.js      # 桌宠部件固化配置
│       ├── cornieBlink.js       # 眨眼动画控制器
│       ├── api.js               # API客户端
│       └── style.css            # 全局样式/变量
├── pic/                         # 桌宠部件图片
├── public/pic/                  # 公共静态资源
├── dist/                        # Vite构建输出
├── doc/                         # 文档
│   ├── Cornie-001-需求分析文档.md
│   └── design/                  # 设计文档
├── criterion/                   # 规范文档
├── index.html                   # 主窗口HTML入口
├── cornie.html                  # 桌宠窗口HTML入口
├── vite.config.js               # Vite配置
└── package.json                 # 项目配置
```

## 3. 数据模型

### 3.1 SQLite 表结构

```sql
-- 元数据/版本管理
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 日记条目（以日期为主键，双视角）
CREATE TABLE IF NOT EXISTS diary_entries (
  date       TEXT PRIMARY KEY,       -- ISO日期 YYYY-MM-DD
  user_text  TEXT,                   -- 用户日记（可空）
  cornie_text TEXT,                  -- Cornie日记（AI生成）
  updated_at INTEGER NOT NULL        -- Unix毫秒时间戳
);

CREATE INDEX IF NOT EXISTS idx_diary_entries_updated_at ON diary_entries(updated_at);
CREATE INDEX IF NOT EXISTS idx_diary_entries_monthday ON diary_entries(substr(date, 6, 5));

-- 对话记录（已建表，API待实现）
CREATE TABLE IF NOT EXISTS conversations (
  id         TEXT PRIMARY KEY,       -- UUID
  date       TEXT NOT NULL,          -- ISO日期 YYYY-MM-DD
  role       TEXT NOT NULL,          -- 'user' | 'cornie'
  content    TEXT NOT NULL,          -- 消息内容
  created_at INTEGER NOT NULL        -- Unix毫秒时间戳
);

CREATE INDEX IF NOT EXISTS idx_conversations_date_created_at ON conversations(date, created_at);
```

### 3.2 数据流

```
用户输入文字 → CorniePet.vue
  → HTTP POST → Express API → 写入 conversations 表
  → Ollama API (/api/generate) → 获取AI回复
  → 写入 conversations 表 → 返回前端展示

日记生成触发（定时/手动）:
  → Express API → 读取当日 conversations
  → Ollama API → 生成Cornie日记文本
  → 写入 diary_entries.cornie_text
```

## 4. API设计

### 4.1 已实现接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /api/health | 健康检查 |
| GET | /api/entries | 列出日记条目（支持?month=YYYY-MM） |
| GET | /api/entries/:date | 获取某天日记 |
| PUT | /api/entries/:date | 保存用户日记 {userText} |
| POST | /api/entries/:date/regenerate-cornie | 重新生成Cornie日记 |
| GET | /api/entries/:date/on-this-day | 往年今日（支持?limit=N） |

### 4.2 待实现接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | /api/conversations | 发送用户消息，返回AI回复（含对话ID） |
| GET | /api/conversations/:date | 获取某日所有对话记录 |
| DELETE | /api/conversations/:date | 删除某日对话 |
| POST | /api/entries/:date/generate-cornie | 触发Cornie日记生成（基于对话） |
| GET | /api/ollama/status | 检查Ollama及模型状态 |

## 5. 关键技术决策

### 5.1 sql.js（而非better-sqlite3）

使用sql.js（纯JS编译的SQLite）而非better-sqlite3（C++原生模块），避免了Electron原生模块编译问题。sql.js将整个数据库加载到内存中，每次写入后调用persist()同步到磁盘。

**权衡**：大数据量时内存占用较高，但MVP阶段数据量有限，可接受。未来数据量增长后可考虑迁移到better-sqlite3。

### 5.2 Express本地HTTP API（而非纯IPC）

渲染进程通过HTTP调用主进程Express API（localhost:5174），而非Electron IPC通道。

**优势**：
- API层可独立测试（无需Electron环境）
- 未来可复用API逻辑到其他客户端（移动端、Web端）
- 开发期可直接用浏览器访问API调试

**注意**：打包后API端口仅监听127.0.0.1，外部不可访问。

### 5.3 双窗口架构

主窗口（index.html）用于日记管理，桌宠窗口（cornie.html）为透明无边框置顶窗口，两者通过共享SQLite数据库实现数据互通。

### 5.4 桌宠渲染方案（MVP阶段用CSS拼装）

MVP阶段不使用Live2D，而是将Cornie拆分为头、身体、尾巴、铃铛4张PNG图片，通过CSS transform拼合，用闭眼/半闭眼图片覆盖层实现眨眼动画。

**优势**：无需学习Live2D SDK，开发周期短，资源占用低。

**局限**：动画表现力有限（仅眨眼），V1阶段考虑引入Live2D。

## 6. 待实现清单

| 模块 | 功能 | 涉及文件 |
| --- | --- | --- |
| 对话 | 对话API路由与服务层 | electron/backend/conversation/* |
| 对话 | Ollama HTTP客户端 | electron/backend/ollama/client.js |
| 对话 | CorniePet.vue对话发送逻辑 | src/renderer/CorniePet.vue |
| 日记生成 | 基于对话的Cornie日记生成 | electron/backend/diary/service.js |
| 日记生成 | 定时触发/手动触发生成 | electron/main.js, 前端 |
| Ollama检测 | 启动时检测Ollama可用性 | electron/main.js |

---

**文档结束**
