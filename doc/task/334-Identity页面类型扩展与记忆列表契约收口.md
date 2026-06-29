# 334-Identity页面类型扩展与记忆列表契约收口

## 1. 任务目标

为长期记忆 Wiki 补齐 Identity 第一阶段所需的正式页面类型，并收口前后端“记忆页面列表”返回契约，为后续 `identity_profile / identity_person / identity_preference / identity_trait` 的稳定落地打底。

本任务完成后，应至少具备：

- Memory Wiki 支持 Identity 新页面类型
- 新页面类型有明确目录映射
- 前端 Memory Wiki 工作台可选择和展示这些新类型
- 记忆页面列表接口返回结构对前端统一可读
- “我的记忆”入口不再依赖不存在的 `pageType: 'memory'`

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/memory-wiki/constants.js`
- `electron/backend/memory-wiki/pageModel.js`
- `electron/backend/memory-wiki/routes.js`
- `src/renderer/api.js`
- `src/renderer/components/MemoryWikiWorkspace.vue`
- `src/renderer/components/ObserveMemoryHome.vue`
- `src/renderer/components/MemoryPageList.vue`

## 4. 当前问题

当前 Memory Wiki 页类型仍停留在较早期的：

- `preference`
- `dislike`
- `need`
- `goal`
- `project`
- `person`
- `topic`
- `event`
- `routine`

但 0630 Identity 设计已经明确要求进一步结构化为：

- `identity_profile`
- `identity_preference`
- `identity_trait`
- `identity_person`

另外当前前端还存在两个契约问题：

1. `ObserveMemoryHome.vue` 使用了不存在的 `pageType: 'memory'`
2. `listMemoryWikiPages()` 的真实返回是 `items`，但部分页面仍按 `pages` 读取

## 5. 目标设计

### 5.1 页类型扩展

新增并正式支持以下页面类型：

- `identity_profile`
- `identity_preference`
- `identity_trait`
- `identity_person`

并为其配置稳定目录：

- `identity_profile` -> `identity/profiles`
- `identity_preference` -> `identity/preferences`
- `identity_trait` -> `identity/traits`
- `identity_person` -> `identity/people`

### 5.2 列表契约收口

前端 Memory Wiki 列表读取应统一为一个稳定结构，至少保证：

- `items` 可继续兼容旧工作台
- `pages` 作为前端友好别名同步可用

### 5.3 “我的记忆”入口修正

“我的记忆”与“铃湾帮你记住的事”应基于 Identity 页类型筛选，而不是请求一个不存在的 `memory` 类型。

## 6. 实现步骤

### Step 1

扩展 Memory Wiki 页类型常量与目录映射。

### Step 2

确认页模型、路由校验、读写流程可接受新类型。

### Step 3

收口前端 `listMemoryWikiPages()` 返回结构，兼容 `items/pages`。

### Step 4

修正前端“我的记忆”入口和工作台页类型选项。

## 7. 测试点

- 新 Identity 页类型可正常创建
- 新页类型文件落入正确目录
- Memory Wiki 工作台可切换并展示新类型
- “我的记忆”入口能看到 Identity 页面
- 前端不再依赖 `pageType: 'memory'`

## 8. 完成标准

- Memory Wiki 具备 Identity 新页类型基础设施
- 前端列表读取契约统一
- “我的记忆”入口能稳定读取 Identity 页面

## 9. 提交建议

`feat(memory-wiki): add identity page types and list contract`

