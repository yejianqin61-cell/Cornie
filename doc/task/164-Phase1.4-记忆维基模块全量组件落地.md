# 164-Phase1.4-记忆维基模块全量组件落地

## 1. 任务目标

在 `src/renderer/components/memory/` 创建 9 个记忆维基组件。

## 2. 交付物

```
src/renderer/components/memory/
├── MemoryWikiHomePage.vue
├── MemoryWikiTree.vue
├── MemoryWikiDetail.vue
├── MemoryWikiSourceRef.vue
├── MemoryWikiRelatedLinks.vue
├── TopicChip.vue
├── MemoryWikiCompare.vue
├── MemoryWikiEditor.vue
├── MemoryWikiEmptyState.vue
└── memory.test.js
```

## 3. 后端对接

| 方法 | API |
|------|-----|
| 页面列表 | listPages({ pageType, status, hydrate }) |
| 页面详情 | getPage(pageId) |
| 来源追溯 | getPageSourceTrace(pageId) |
| 版本列表 | listVersions(pageId) |
| 版本对比 | getVersionDiff(pageId, { fromVersionId, toVersionId }) |
| 新建页面 | createPage(body) |
| 编辑页面 | updatePage(pageId, body) |
| Topic 列表 | listTopics() |
| 治理列表 | listGovernance({ status }) |

## 4. 验收

- [ ] 9 组件全部创建
- [ ] 树形导航 + 详情 + 版本对比三栏
- [ ] 测试通过