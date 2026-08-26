# T-26-01 记忆 Wiki 详情与面板族组件化（含文案治理）

## 范围文件

- `components/MemoryPageDetail.vue`（重灾区：rgba×17、长文案×31）
- `components/MemoryWikiHome.vue`
- `components/MemoryWikiTree.vue`
- 面板族空态文案：ConfirmationPanel / GovernanceQueuePanel / GovernanceDetailPanel / VersionPanel / TopicIndexPanel / PageListPanel
- `composables/useMemoryWikiWorkspace.js` 的用户可见错误文案精简

## 改造清单

### 组件化（R5）
1. MemoryPageDetail 的卡片容器、操作按钮（编辑/保存/归档/恢复/回滚）换 `<UiCard>`/`<UiButton>`；
2. 空态与加载失败占位换 `<UiEmpty>`；
3. 状态徽标（active/inactive/archived、importance）换 `<UiBadge>`。

### Token（R1/R2）
4. 17 处 rgba 渐变/边框 → token 或 `color-mix()`；3 处 hex 同理；
5. 详情页字号全部改 `var(--text-*)`。

### 文案（R3，逐条清理）
6. 删除机制解释型文案，例如：
   - 「记下你的名字、身份、你和铃湾的关系，或者你最近的人生状态。」→「名字、关系与近况。」
   - 「先从左边选中一个记忆页面，我就把这页的版本历史整理给你看。」→「先选一页记忆」
   - 「现在没有排队等你点头的高风险动作，小铃湾先乖乖看着。」→「暂无待确认动作」
   - 「这里暂时还没有记忆页面。等铃湾和主人慢慢把重要的人、事、偏好记下来，…」→「还没有记忆页面」
   - 「点一个主题，我就把它的索引详情展开给主人看。」→「选择主题查看详情」
   - 表单 placeholder 的举例句压缩到 ≤24 字或改为单词示例；
7. 错误提示保留但精简（如 composable 中 frontmatter 损坏类错误，压到一句 ≤24 字 + 不解释内部机制）。

### 去堆叠（R4）
8. MemoryPageDetail 内部的来源追溯块、别名块等**去掉第二层边框+背景盒子**，改用分隔线/留白分区。

## 验收标准

1. 门禁脚本注册本清单文件后 R1–R5 全绿；
2. `tests/frontend/memory-page-user-flow.test.mjs`、`memory-wiki-home.test.mjs`、`memory-wiki-tree.test.mjs` 全绿（断言的交互不变；若断言依赖被删文案，更新断言为等价短文案）；
3. `npm run lint` 0 错误。

## 依赖

T-26-0（门禁就绪）。
