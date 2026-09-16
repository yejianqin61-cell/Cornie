# 171-Phase2.5-记忆维基链路联调

## 1. 任务目标

记忆维基模块 API 联调，loading/empty/error 三态。

## 2. 改造组件

| 组件 | 路径 | 改造 |
|------|------|------|
| MemoryWikiHomePage.vue | `components/memory-wiki/` | loading/error 态 |

## 3. 验收标准
- [ ] 加载时 skeleton
- [ ] 加载失败 error + 重试
- [ ] 测试覆盖