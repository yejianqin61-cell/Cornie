# 058 Memory Wiki 服务层统一入口与基础 CRUD

## 1. 任务目标

在 `M1` Markdown 存储底座之上，建立 `Memory Wiki` 统一服务层入口，先补齐页面级基础 CRUD 与列表能力，形成可供工具层和前端层复用的业务能力层。

## 2. 任务来源

- `doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md` 第 9 节
- `doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md` 第 16.3.2 节 `M2 Memory Wiki 服务模块`

## 3. 前置依赖

- `M1 Markdown Wiki 存储模块` 已完成

## 4. 涉及范围

- `electron/backend/memory-wiki/`
- `scripts/`

## 5. 当前问题

当前 `memory-wiki` 只有存储能力，没有业务服务层，意味着：

- 工具层还没有统一服务入口可调。
- 前端和模型都无法复用统一页面业务规则。
- 页面创建、保存、读取、列出、删除还停留在底层文件读写层。

## 6. 目标设计

本任务完成后应具备：

- `createMemoryWikiService(storeLikeConfig)` 统一入口。
- 页面创建、读取、更新、删除、列出。
- 以 `page_id` 为主键进行服务层操作。
- 页面元数据摘要输出与列表输出统一。

## 7. 实现步骤

### Step 1

定义服务层输入输出结构。

### Step 2

封装 `create/get/update/delete/list`。

### Step 3

补 `page_id -> 文件路径` 的服务层映射。

### Step 4

增加最小验证脚本。

## 8. 测试点

- 新建页面后可通过 `page_id` 查询。
- 更新页面后再读取结果一致。
- 删除页面后不可再读取。
- 列表结果包含必要元数据。

## 9. 完成标准

- `Memory Wiki` 服务层已可提供基础页面业务能力。
- 工具层和前端层可以把它当成统一入口使用。

## 10. 交付物

- `memory-wiki service` 代码
- 对应验证脚本

---

**文档结束**
