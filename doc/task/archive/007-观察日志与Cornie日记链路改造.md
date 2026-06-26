# 007 观察日志与Cornie日记链路改造

## 1. 任务目标

建立“观察日志是事实层，Cornie 日记是关怀层”的双层结构，并完成 Cornie 日记生成源的迁移：

- 原主输入：原始对话文本
- 新主输入：当天观察日志 + 人类日记 + 相关长期记忆摘要

本任务完成后，Cornie 日记应更像铃湾的温柔回顾，而不是简单聊天流水总结。

## 2. 任务来源

- `doc/design/Cornie-0625-模型侧改进设计.md`
- `doc/design/module/007-observation-diary/Cornie-007-观察日志与Cornie日记模块-改进设计.md`

## 3. 前置依赖

- `003-对话编排主链路改造.md`
- `004-工具策略层与确认流落地.md`
- `008-长期记忆与轻量RAG落地.md`

## 4. 涉及文件

### 4.1 现有文件

- `electron/db.js`
- `electron/backend/diary/service.js`
- `electron/backend/diary/routes.js`
- `src/renderer/App.vue`

### 4.2 建议新增文件

- `electron/backend/observation/service.js`
- `electron/backend/observation/tools.js`
- `electron/backend/diary/generator.js`

## 5. 数据结构设计

### 5.1 观察日志表

```sql
CREATE TABLE IF NOT EXISTS observation_logs (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL,             -- expense | income | todo | schedule | mood | event | misc
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  related_ref TEXT,
  source_text TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### 5.2 现有日记表复用

沿用 `diary_entries`，但 `cornie_text` 的生成源发生变化。

## 6. 工具接口定义

- `observation.add_note`
- `observation.update_note`
- `observation.delete_note`
- `observation.get`
- `observation.list_today`
- `observation.list_by_range`
- `diary.generate_from_observations`

## 7. 观察日志写入规则

### 7.1 每轮按需记录

模型在每轮对话后先看“今日观察日志摘要”，判断：

- 新增观察日志
- 更新已有观察日志
- 不记录

### 7.2 不记录的典型情况

- 纯寒暄
- 低信息量回应
- 已记录事实的重复表达，且无新增信息

## 8. Cornie 日记生成规则

### 8.1 输入

- 当天观察日志
- 人类日记
- 相关长期记忆摘要

### 8.2 风格要求

- 第一人称
- 自称铃湾或小铃湾
- 文学化、温柔、克制
- 不虚构当天没有发生的核心事实

### 8.3 生成模式

- 手动生成
- 定时生成
- 重新生成

## 9. 实现步骤

### Step 1

改造 `electron/db.js`

- 增加观察日志表
- 提供 CRUD

### Step 2

新增 `observation/service.js`

- 封装观察日志业务逻辑

### Step 3

新增 `observation/tools.js`

- 暴露观察日志工具

### Step 4

重构 `diary/service.js`

- 将日记生成逻辑拆到 `diary/generator.js`
- 输入改为观察日志 + 人类日记 + 记忆摘要

### Step 5

实现观察日志摘要函数

- 为对话编排层提供今日观察日志摘要

### Step 6

增加定时生成机制

- 可先用简单调度器实现

## 10. 测试点

### 10.1 单元测试建议

- 观察日志新增成功
- 相同事实重复输入时可更新或跳过
- 日记生成输入源已切换

### 10.2 联调测试

- 记账完成后可写观察日志
- 对话中的重要事件可形成观察日志
- 手动生成 Cornie 日记时内容明显基于观察日志与人类日记

## 11. 完成标准

- 观察日志工具可用
- 对话后可按需新增/更新/跳过观察日志
- Cornie 日记已不再主要依赖原始聊天文本

## 12. 注意事项

- 后端只做轻量整理，不做复杂语义优先级筛选
- 观察日志过多时，后续可再引入压缩策略

---

**文档结束**
