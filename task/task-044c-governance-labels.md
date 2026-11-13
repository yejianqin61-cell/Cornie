# task-044c 治理面板的中文标签与证据摘要

## 1. Where this task sits

- **Phase 4 主人能看见并纠正记忆治理**，目标是主人在记忆页能确认一页、合并两页、触发巡检，并在审计视图看到这些操作；治理面板全部是中文。
- **本任务推进 R-15 治理面板用人话展示类型、状态和证据**：列表和详情里不再出现英文枚举与原始 JSON。
- **Starts after**：task-044b 记忆列表返回真实总数。**Waits on**：task-044e 巡检按钮与审计视图（复用本任务建的标签文件）。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/memory/MemoryWikiHomePage.vue` 的治理面板（`mw-governance` 一段）— 现在直接显示 `item.requestType`、`item.status`、`item.requestId` 和 `JSON.stringify(evidence)`。
- `src/renderer/components/memory/MemoryWikiHomePage.test.js` 的"shows governance evidence and applies only after approval" — 现有断言文本含 `archive_page`、`归档过期偏好`。
- `electron/backend/memory-wiki/service.js` 的 `buildGovernanceRequestFrom*` 和 `memoryDistillation.js` 的入队处 — 请求的字段形状：`payload.kind`（巡检修复）、`payload.request.action`（LLM 提议）、`reason`、`pageIds`。

**Settled**

- 标签放在新文件 `src/renderer/components/memory/memoryLabels.js`，导出四个对象，键与文字固定如下：
  - 请求类型：`memory_wiki_llm_proposal` LLM 记忆变更提议；`identity_person_review` 人物信息复核；`identity_person_relationship_conflict` 人物关系冲突；`identity_profile_conflict` 主人画像冲突；`identity_trait_review` 性格侧写复核；`repair_suggestion` 巡检修复建议；`archive_candidate` 归档候选；`observation_compression_candidate` 观察日志压缩候选；`identity_profile_upgrade_candidate` 观察升级为画像；`identity_preference_upgrade_candidate` 观察升级为偏好；`identity_trait_upgrade_candidate` 观察升级为性格侧写；`identity_person_upgrade_candidate` 观察升级为人物。
  - 状态：`pending` 待审；`approved` 已批准；`rejected` 已拒绝；`deferred` 已延期；`applied` 已应用。
  - 动作：`create_page` 新建页面；`update_page` 更新页面；`merge_pages` 合并页面；`rollback_page` 回滚页面；`archive_page` 归档页面；`delete_page` 删除页面。
  - 修复项（`payload.kind`）：`unlink_topic_page` 解除失效的主题页面引用；`remove_related_page` 移除失效的关联页面；`remove_page_source_ref` 移除失效的来源引用；`unlink_topic_chat_ref` 解除失效的主题聊天引用；`unlink_topic_observation_ref` 解除失效的主题观察引用；`review_or_archive_page` 核对或归档页面。
- 未知键回退为原始值，不报错。
- 详情区新增"摘要"行：涉及页面（`pageIds`，空则不显示）、原因（`reason`）、拟执行（动作或修复项标签；LLM 提议还显示 `payload.request.summary`，若有）。
- 原始 JSON 收进 `<details>`，默认折叠，标题"原始数据"；列表项显示"类型标签 + 状态标签 + `title`"，不再显示 `requestId`。
- 治理面板保持在 `MemoryWikiHomePage.vue` 里，不拆组件：现有测试通过 `wrapper.vm` 调用 `openGovernance`、`decideGovernance`、`applyGovernance`。

**Edges and seam**

- Seam：`MemoryWikiHomePage.test.js`（挂载页面、调用 `wrapper.vm` 方法、断言文本）。不新增 seam。
- 新增 `memoryLabels.js`；改 `MemoryWikiHomePage.vue` 和该测试文件。

**Run**

- `npx vitest run src/renderer/components/memory`
- `npm run lint`

**Unknowns**

- 如果 `stylelint` 对新增样式报错（项目的规则比较严），按报错修正样式，不要改 `.stylelintrc.json`。

## 3. The workflow

1. 阅读第 2 部分的文件，用一句话复述本任务：治理面板的类型、状态和证据全部显示中文，原始 JSON 折叠。
2. 先写 Case 1 至 Case 4 的红测试。
3. 新建 `memoryLabels.js`，按 Settled 写四个对象和一个取标签函数（未知键回退原值）。
4. 改列表项显示：类型标签、状态标签、标题。
5. 改详情区：摘要行加原始数据折叠。
6. 运行第 2 部分的两条命令，确认现有的"证据"测试仍然通过（原始 JSON 仍在 DOM 里）。
7. 提交：`feat(memory): show governance requests in plain Chinese`。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 1 | 列表含 `memory_wiki_llm_proposal` / `pending` 的请求 | 列表文字含"LLM 记忆变更提议"和"待审"，不含 `memory_wiki_llm_proposal` | `MemoryWikiHomePage` |
| 2 | 选中请求，`payload.request.action` 为 `archive_page`，`reason` 为"归档过期偏好" | 详情含"归档页面"和"归档过期偏好" | `MemoryWikiHomePage` |
| 3 | 请求类型为字面量 `brand_new_type` | 列表显示 `brand_new_type`，不报错 | `MemoryWikiHomePage` |
| 4 | 五种状态各一条 | 分别显示待审、已批准、已拒绝、已延期、已应用 | `MemoryWikiHomePage` |
| 5 | 选中请求后 | 页面存在 `<details>`，其内容含原始 JSON 的 `archive_page` | `MemoryWikiHomePage` |

标签文字就是 Settled 里写死的对照表，不来自读组件代码。
