# 356-Identity页面关系编辑与治理提示补齐

## 1. 任务目标

把 `identity_profile / identity_person / identity_preference / identity_trait` 之间的 `relatedPageIds` 从底层字段升级为真正可编辑、可阅读、可治理的关系能力。

## 2. 任务来源

- `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`
- `doc/design/Cornie-0630-记忆层改进治理总纲-第一版.md`

## 3. 涉及范围

- `electron/backend/memory-wiki/service.js`
- `src/renderer/components/MemoryWikiWorkspace.vue`
- `src/renderer/api.js`

## 4. 当前问题

虽然系统已有 `relatedPageIds`，但还没有：

- Identity 专项的关系编辑入口
- 关系推荐链路说明
- 错误关系与孤立关系的治理提示

## 5. 目标设计

- 支持主身份页关联人物、偏好、侧写页
- 支持人物页回链主身份页
- 在详情区可直接查看和调整相关页
- 为后续治理预留错误关系提示落点

## 6. 实现步骤

### Step 1

收口 Identity 相关页的后端读写入口。

### Step 2

在工作台提供关系选择与移除操作。

### Step 3

补充关系为空、关系失效、关系不对称时的提示表达。

## 7. 测试点

- Identity 页面可互相关联
- 相关页信息可稳定保存和展示
- 无效关系有清晰提示

## 8. 完成标准

- Identity 页面关系从“存得下”升级为“用得起来”

## 9. 提交建议

`feat(memory-wiki): add identity related-page editing`
