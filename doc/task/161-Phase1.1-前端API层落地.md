# 161-Phase1.1-前端API层落地

## 1. 任务目标

在 `src/renderer/api/` 建立统一的前端 API 层，封装所有后端 HTTP 接口。

后端 API 端口 5174（Electron 主进程 Express），CORS 已配置允许 `http://127.0.0.1:5173`。

## 2. 交付物

```
src/renderer/api/
├── client.js          # fetch 封装 + 统一错误处理
├── diary.js           # /api/entries/*
├── conversation.js    # /api/conversations/*
├── observation.js     # /api/observations/*
├── memory-wiki.js     # /api/memory-wiki/*
├── ledger.js          # /api/ledger/*
├── todo.js            # /api/todos/*
├── schedule.js        # /api/schedules/*
├── settings.js        # /api/settings/*
└── model.js           # /api/model/*
```

## 3. 后端接口速查

### diary
| 方法 | 路径 | 用途 |
|------|------|------|
| GET | /api/entries?month=YYYY-MM | 日记列表 |
| GET | /api/entries/:date | 单日日记 |
| PUT | /api/entries/:date {userText, cornieText?} | 编辑日记 |
| POST | /api/entries/:date/regenerate-cornie | 重新生成 Cornie 日记 |
| GET | /api/entries/:date/on-this-day?limit=N | 往年今日 |

### conversation
| 方法 | 路径 | 用途 |
|------|------|------|
| POST | /api/conversations {message, date?} | 发送消息 |
| POST | /api/conversations/stream {message, date?} | SSE 流式 |
| GET | /api/conversations/:date | 获取对话 |
| DELETE | /api/conversations/:date | 删除对话 |

### observation
| 方法 | 路径 | 用途 |
|------|------|------|
| GET | /api/observations | 列表 |
| GET | /api/observations/:id | 详情 |
| POST | /api/observations | 新建 |
| PUT | /api/observations/:id | 编辑 |
| DELETE | /api/observations/:id | 删除 |

### memory-wiki
| 方法 | 路径 | 用途 |
|------|------|------|
| GET | /api/memory-wiki/pages | 页面列表 |
| GET | /api/memory-wiki/pages/:pageId | 页面详情 |
| GET | /api/memory-wiki/pages/:pageId/source-trace | 来源追溯 |
| GET | /api/memory-wiki/pages/:pageId/versions | 版本列表 |
| GET | /api/memory-wiki/pages/:pageId/version-diff | 版本对比 |
| POST | /api/memory-wiki/pages | 新建页面 |
| PUT | /api/memory-wiki/pages/:pageId | 编辑页面 |
| GET | /api/memory-wiki/topic-index | Topic 列表 |
| GET | /api/memory-wiki/governance | 治理列表 |

### ledger
| 方法 | 路径 | 用途 |
|------|------|------|
| GET | /api/ledger/entries | 列表/筛选 |
| GET | /api/ledger/entries/:id | 详情 |
| POST | /api/ledger/entries/expense | 新增支出 |
| POST | /api/ledger/entries/income | 新增收入 |
| PUT | /api/ledger/entries/:id | 编辑 |
| DELETE | /api/ledger/entries/:id | 删除 |

### todo
| 方法 | 路径 | 用途 |
|------|------|------|
| GET | /api/todos?view=open\|completed\|today | 列表 |
| GET | /api/todos/:id | 详情 |
| POST | /api/todos {title} | 新建 |
| PUT | /api/todos/:id | 编辑 |
| POST | /api/todos/:id/complete | 完成 |
| POST | /api/todos/:id/reopen | 重开 |
| DELETE | /api/todos/:id | 删除 |

### schedule
| 方法 | 路径 | 用途 |
|------|------|------|
| GET | /api/schedules?view=upcoming\|today | 列表 |
| GET | /api/schedules/:id | 详情 |
| POST | /api/schedules {title, startAt} | 新建 |
| PUT | /api/schedules/:id | 编辑 |
| POST | /api/schedules/:id/cancel | 取消 |
| POST | /api/schedules/:id/restore | 恢复 |
| DELETE | /api/schedules/:id | 删除 |

### settings
| 方法 | 路径 | 用途 |
|------|------|------|
| GET | /api/settings/model | 获取模型配置 |
| PUT | /api/settings/model | 保存模型配置 |
| DELETE | /api/settings/model | 清除模型配置 |

### model
| 方法 | 路径 | 用途 |
|------|------|------|
| GET | /api/model/status | 模型状态 |
| GET | /api/health | 健康检查 |

## 4. 验收

- [ ] 10 个 api 文件全部创建
- [ ] client.js 统一 base URL、错误处理、JSON 解析
- [ ] 所有函数签名与后端路径一一对应