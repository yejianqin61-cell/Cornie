# Cornie 4.2.5 本地化与隐私模块详细设计

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | Cornie 4.2.5 本地化与隐私模块详细设计 |
| 文件名称 | Cornie-4.2.5-本地化与隐私模块-详细设计.md |
| 产品名称 | Cornie（铃湾） |
| 文档编号 | Cornie-4.2.5 |
| 文档类型 | 详细设计 |
| 文档版本 | V1.0 |
| 文档状态 | 编写中 |
| 编写日期 | 2026-05-17 |
| 适用对象 | 研发 |
| 上游文档 | ../Cornie-001-需求分析文档.md, Cornie-4.2-技术架构-详细设计.md |
| 下游文档 | - |
| 关联规范 | ../../criterion/Cornie-backend-api规范.md |
| 存放目录 | doc/design/ |

### 1.1 修订记录

| 版本 | 日期 | 修订人 | 修订说明 |
| ---- | ---- | ------ | -------- |
| V1.0 | 2026-05-17 | Claude | 初始版本，覆盖MVP本地化与隐私模块 |

## 2. 模块概述

本地化与隐私模块是Cornie的核心基础保障。所有用户数据（对话、日记）完全本地存储，不经过任何远程服务器，AI推理通过本地Ollama完成。该模块同时负责Ollama环境的检测与引导安装。

### 2.1 MVP功能范围

| 功能点 | 描述 | 优先级 | 实现状态 |
| --- | --- | --- | --- |
| 完全本地 | 所有数据本地存储，不上传任何服务器 | P0 | 已完成 |
| Ollama集成 | 启动时检测Ollama及Qwen3.5模型可用性，未安装时引导 | P0 | 待实现 |
| 离线可用 | 不依赖互联网，所有功能离线运行 | P0 | 已完成 |
| 数据清除 | 用户可一键删除所有对话和日记数据 | P1 | 待实现 |

## 3. 数据存储方案

### 3.1 存储位置

所有数据存储在Electron `userData` 目录下：

| 平台 | 路径 |
| --- | --- |
| Windows | `%APPDATA%/cornie/cornie.sqlite3` |
| macOS | `~/Library/Application Support/cornie/cornie.sqlite3` |
| Linux | `~/.config/cornie/cornie.sqlite3` |

代码中通过 `app.getPath('userData')` 获取，不硬编码路径。

### 3.2 数据库方案（sql.js）

使用sql.js（纯JavaScript编译的SQLite），优势：
- 零原生依赖，无需编译.node模块
- 与Electron各版本兼容
- 数据库文件为单一.sqlite3文件，方便备份迁移

**数据安全**：
- 数据存储在用户目录下，随操作系统用户权限隔离
- 无任何数据上传行为
- 不收集任何用户行为数据、分析数据
- 无第三方SDK或追踪代码

### 3.3 数据库文件结构

```
cornie.sqlite3
├── meta            # 版本号等元数据
├── diary_entries   # 日记条目
└── conversations   # 对话记录
```

## 4. Ollama集成方案

### 4.1 架构关系

```
Cornie应用
  ├── 启动时检测 → Ollama HTTP API (:11434)
  │   ├── 服务可用？→ 检查模型列表
  │   │   ├── qwen3.5已安装 → 正常启动
  │   │   └── qwen3.5未安装 → 提示用户下载
  │   └── 服务不可用 → 引导用户安装Ollama
  └── 运行时调用 → Ollama /api/chat, /api/generate
```

### 4.2 启动检测流程（electron/main.js）

```
app.whenReady()
  → 启动Express API (:5174)
  → 创建窗口
  → 检测Ollama状态:
    ├── fetch http://127.0.0.1:11434/api/tags
    │   ├── 成功 → 检查模型列表是否包含 qwen
    │   │   ├── 有 → 正常，不打扰
    │   │   └── 无 → 通过API返回状态给前端展示引导
    │   └── 失败 → Ollama未运行
    └── 前端根据状态显示对应UI
```

### 4.3 API：GET /api/ollama/status

```json
// 正常
{
  "ok": true,
  "hasModel": true,
  "models": ["qwen3.5:1.8b"]
}

// Ollama未运行
{
  "ok": false,
  "hasModel": false,
  "hint": "Ollama服务未运行。请确保已安装Ollama并启动。下载地址：https://ollama.com"
}

// 模型未安装
{
  "ok": true,
  "hasModel": false,
  "hint": "请在终端运行：ollama pull qwen3.5"
}
```

### 4.4 前端引导UI（主窗口）

**Ollama未安装/未运行**：
- 主窗口顶部显示黄色提示条："Cornie需要Ollama提供AI能力。请先安装Ollama并下载qwen3.5模型。"
- 提供按钮：[下载Ollama] [已安装，重新检测]

**模型未下载**：
- 提示条："检测到Ollama已运行，但qwen3.5模型未下载。请在终端运行：ollama pull qwen3.5"
- 提供按钮：[重新检测]

**全部OK**：
- 不显示任何提示，正常使用

### 4.5 模型推荐

| 模型 | 大小 | 推荐场景 |
| --- | --- | --- |
| qwen3.5:1.8b | ~1.5GB | 低配电脑，首次体验 |
| qwen3.5:4b | ~4GB | 中配电脑，更好质量 |
| qwen3.5:7b | ~8GB | 高配电脑，最佳质量 |

MVP阶段优先推荐1.8b版本，平衡速度与质量。

## 5. 数据清除功能

### 5.1 API设计

```
DELETE /api/data/clear?scope=all|diaries|conversations
```

### 5.2 清除范围

| scope | 操作 | 说明 |
| --- | --- | --- |
| all | 删除所有diary_entries和conversations | 完全重置 |
| diaries | 删除所有diary_entries | 保留对话 |
| conversations | 删除所有conversations | 保留日记 |

### 5.3 前端交互

- 设置面板中显示"清除数据"按钮
- 点击后弹出确认框，列出将删除的内容范围
- 用户确认后执行删除
- 删除完成后显示确认提示

### 5.4 安全措施

- 删除操作为不可逆操作（不提供回收站）
- 删除前必须用户二次确认
- 确认框中明确列出将删除的数据类型和数量
- 数据库文件直接删除表内容（DELETE FROM），而非删除文件

## 6. 离线保障

### 6.1 无网络依赖检查清单

| 依赖项 | 离线可用 | 说明 |
| --- | --- | --- |
| 应用启动 | ✓ | Electron离线运行 |
| 日记读写 | ✓ | 本地SQLite |
| 对话存储 | ✓ | 本地SQLite |
| AI对话/生成 | ✓ | 本地Ollama推理 |
| UI资源 | ✓ | 所有CSS/图片/字体本地打包 |
| 外部链接 | ✗ | 引导页中的Ollama下载链接需网络 |

### 6.2 开发规范

- 不在代码中引入任何CDN资源
- 所有图片、字体、CSS内联或打包
- 不在运行时发起任何外部HTTP请求（除Ollama localhost）
- 不使用Google Fonts、第三方图标库等外部资源

## 7. 待实现清单

| 优先级 | 任务 | 涉及文件 |
| --- | --- | --- |
| P0 | Ollama状态检测API | electron/backend/ollama/client.js, server.js |
| P0 | Ollama启动检测逻辑 | electron/main.js |
| P0 | 前端Ollama状态提示UI | src/renderer/App.vue |
| P1 | 数据清除API + 前端 | electron/backend/新增路由, src/renderer/App.vue |
| P1 | 设置面板基础UI | src/renderer/App.vue 或新组件 |

---

**文档结束**
