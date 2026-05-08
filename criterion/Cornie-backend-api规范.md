# Cornie 本地后端 API 规范（MVP）

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | Cornie 本地后端 API 规范（MVP） |
| 文件名称 | Cornie-backend-api规范.md |
| 产品名称 | Cornie（铃湾） |
| 文档编号 | Cornie-Criterion-API |
| 文档类型 | 规范 / 接口 |
| 文档版本 | V1.0 |
| 文档状态 | 生效 |
| 编写日期 | 2026-05-08 |
| 适用对象 | 前端 / 后端 / 测试 |
| 上游文档 | Cornie-001-需求分析文档.md |
| 下游文档 | - |
| 关联规范 | Cornie-doc文档规范.md |
| 存放目录 | criterion/ |

### 1.1 修订记录

| 版本 | 日期 | 修订人 | 修订说明 |
| ---- | ---- | ------ | -------- |
| V1.0 | 2026-05-08 | 叶健钦 / AI | MVP 日记本 API 首版 |

## 2. 总体说明

- **服务定位**：Electron 主进程内启动的本地 HTTP 服务，仅供本机渲染进程调用
- **Base URL**：`http://127.0.0.1:5174/api`
- **数据存储**：SQLite（`sql.js`）持久化到用户目录 `cornie.sqlite3`
- **统一响应**：成功返回 JSON；失败返回 `{ "error": "..." }`

## 3. 健康检查

### 3.1 GET `/health`

响应：

```json
{ "ok": true, "version": 1 }
```

## 4. 日记本（Diary）

### 4.1 GET `/entries?month=YYYY-MM`

说明：获取某月内存在记录的日期列表（按日期倒序）。`month`可选，不传则返回全部。

响应：

```json
{
  "entries": [
    { "date": "2026-05-08", "hasUserText": true, "hasCornieText": false }
  ]
}
```

### 4.2 GET `/entries/:date`

说明：获取指定日期的日记内容；不存在则返回空内容结构。

响应：

```json
{
  "entry": { "date": "2026-05-08", "userText": "", "cornieText": "" }
}
```

### 4.3 PUT `/entries/:date`

说明：更新“我的日记”（`userText`），其余字段保留。

请求体：

```json
{ "userText": "..." }
```

响应：

```json
{
  "entry": { "date": "2026-05-08", "userText": "...", "cornieText": "" }
}
```

约束：

- `userText` 最大 50,000 字符
- `date` 必须为 `YYYY-MM-DD`

### 4.4 POST `/entries/:date/regenerate-cornie`

说明：MVP 阶段为占位实现（写入固定文案）。后续接入本地模型时替换此行为。

响应：

```json
{
  "entry": { "date": "2026-05-08", "userText": "...", "cornieText": "..." }
}
```

## 5. 错误响应

示例：

```json
{ "error": "invalid date" }
```

