# Cornie 前端工程规范审计报告

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | Cornie 前端工程规范审计报告 |
| 文件名称 | Cornie-025-前端工程规范审计报告.md |
| 产品名称 | Cornie（铃湾 / 小铃湾） |
| 文档编号 | Cornie-025 |
| 文档类型 | 审计报告（Audit） |
| 文档版本 | V1.0 |
| 文档状态 | 生效中 |
| 编写日期 | 2026-08-22 |
| 适用对象 | 研发 / 测试 / 产品 |
| 审计基线 | `master` @ `08b851d`（含未跟踪 `scripts/scan-memory-wiki-frontmatter.mjs` 不计入） |
| 关联规范 | `criterion/Cornie-backend-api规范.md`、`criterion/Cornie-doc文档规范.md`、`criterion/Cornie-commit-message规范.md` |
| 存放目录 | `doc/` |

### 1.1 修订记录

| 版本 | 日期 | 修订人 | 修订说明 |
| ---- | ---- | ------ | -------- |
| V1.0 | 2026-08-22 | AI | 基于 master@08b851d 的静态扫描 + 抽样阅读 + 测试基线，产出分维度审计结论与整改路线 |

---

## 2. 审计范围与方法

**范围**：`src/renderer/`（49 个文件，14,075 行）、`tests/frontend/`（22 个测试文件）、`package.json` 工具链、`criterion/` 规范覆盖面。

**方法**：

1. 全量静态扫描：token 引用密度、硬编码颜色/字号、类名重复定义、组件引用关系、SFC 写法一致性；
2. 抽样精读：`App.vue`、`MemoryWikiHome.vue`、`style.css`、`request.js`、三大组件（Workspace/LedgerHome/PageDetail）的结构占比；
3. 交叉核对：`criterion/` 三份规范、`scripts/check-repo-cleanliness.mjs`、`scan-unused-components.mjs`、前端测试基线（18 文件 113 用例全过）。

---

## 3. 总体结论

> **前端工程规范度：中等偏下（骨架有纪律，UI 工程层未体系化）。**

一句话判断：这个前端有**良好的编码纪律**（SFC 写法统一、请求层结构化、测试专项意识强），但**没有建立设计系统与基础组件库这两层工程设施**——样式靠全局元素选择器 + 组件间复制粘贴，复用靠人肉约定而不是可复用资产。当前"不满意"的体感是真实的，且主要来源不是某个页面写得差，而是缺了下面三层：

| 缺失层 | 后果 |
| --- | --- |
| Design Token 刻度（字号/间距/圆角/阴影） | 每个页面自己拍像素，全站观感漂移 |
| 基础 UI 组件库（Button/Card/Empty/Modal…） | 同一块"卡片头""空态"在 8 个文件里各写一份，改一处漏七处 |
| 静态检查工具链（ESLint/Stylelint/Prettier） | 上述劣化无人拦截，只会继续累积 |

---

## 4. 分维度审计

### A. 样式体系与 Design Token —— ⚠️ 部分达标（颜色有 token，刻度缺失）

**已有资产**（`src/renderer/style.css`，152 行）：

- 约 40 个 `:root` token：基底色 / 文字 / 边框 / 强调色 / 语义色（danger/success/warning 及 soft 变体）/ 六个模块 tint / 一整套 `pet-*` 桌宠专用 token；
- 全局元素级样式：`button`（含 primary/danger/ghost 语义变体）、`input/textarea`、`.card`；
- 这是"轻量主题层"，不是 token 系统。

**量化缺口**：

| 指标 | 数值 | 说明 |
| --- | --- | --- |
| 组件内硬编码 hex 颜色 | **64 处** | LedgerHome 13 处、MemoryPageDetail 11 处、TodoHome 7 处…… |
| 组件内硬编码 `rgba()` | **246 处** | 大量是 token 色的 alpha 手调变体（如 `rgba(232,133,106,.10)` 即 accent 的 10% 透明版），无 `color-mix()` 或衍生 token 方案 |
| 不同 font-size 取值 | **18 种** | 12px×103、13px×93、11px×36、15px×11、17px×1……无任何字号 token，纯手拍 |
| 间距 / 圆角 / 阴影 / z-index token | **0 个** | 圆角出现 10/12/14/16/18/20px 多档并存；z-index 无管理 |
| token 违例实例 | App.vue `.statusDot.ok` 写死 `#5B9A6B`，而 `--success` 就在 style.css 里 | 有 token 不用的典型样本 |

**结论**：颜色 token 覆盖约六成且无强制手段；排版/空间维度完全没有 token。"约定好的 CSS token"这个问题答案是：**只有半套，且不设防。**

### B. 组件库 —— ❌ 未建立

- **没有 `ui/` 基础组件层**。33 个业务组件之外，不存在 BaseButton/BaseCard/BaseModal/BaseEmpty/BaseTag 之类的可复用原语。
- 复用实际靠两种原始方式：
  1. 全局元素样式（`button{}` 直接改所有按钮）+ class 字符串约定（`primary`/`ghost`/`danger`）；
  2. **复制粘贴 scoped 样式**。实证：

| 被复制的局部样式 | 重复定义文件数 |
| --- | --- |
| `.workspaceCard` + `.cardHead` + `.cardTitle` 三件套 | 8 个 MemoryWiki* 组件 |
| `.emptyDetail`（空态占位） | 7 个文件 |
| `.detailMeta`（详情元信息块） | 4 个文件 |
| `.evidenceTitle` | 12 处使用、多处重复定义 |

- 弹窗/抽屉/确认等 overlay 类交互只有 `ConfirmCard` 一个特例，无统一机制。
- 类名命名法混杂：camelCase（`detailMeta`）、wiki 前缀域风格（`wikiSidebar`）、语义串（`guideBannerInner`）并存，无 BEM 或其他约定背书。

**结论**：这不是"组件库建得不好"，是**还没有组件库这一层**；每新增一个面板，样式债务同步 +1 份。

### C. 架构与状态 —— ⚠️ 可用但自造轮子，已现维护裂缝

**事实清单**：

1. **无 vue-router**：`App.vue`（472 行）手写 8 大模块 × 各自字符串子视图栈（`chatView`/`diaryView`/`observeView`/`memoryView`/`settingsView`）+ 模板里 30+ 分支的 `v-if/v-else-if` 链；切模块时靠一个 watch 手工重置 5 组 ref——每加一个模块就要记得来这里补一行重置，属易漏模式。
2. **无 pinia**：跨模块跳转全部走两层事件手工接线（如 `MemoryWikiHome → emit open-chat-source → App.vue → mode/chatHistoryDate/chatFocusMessageId/chatView 四连赋值`）。事件 payload 形状无类型约束。
3. **死导入**：App.vue 第 13 行引入 `MemoryPageDetail` 但模板从未使用（`bbcea91` 退役旧列表视图后的遗留）——恰好证明缺 lint 的代价已经开始兑现。
4. **记忆 Wiki 双入口并存**：`MemoryWikiHome`（树+详情，挂主导航）与 `MemoryWikiWorkspace`（1205 行，治理队列+编辑器+列表面板三合一，挂在 设置→高级设置 里）是两套并行的 Wiki 前端界面，职责边界模糊。
5. **api.js 单文件 687 行**：7 个域（diary/conversation/model/ledger/todo/schedule/memory-wiki/observations）92+ 个导出函数混居一处，仅靠注释分节；每域一个文件的拆分条件早已成熟。
6. 导航状态不持久化：刷新后回到聊天页，用户位置丢失（对比：Wiki 树选中态 T-05 已做持久化，说明该意识存在但未上升为全局机制）。

**正面项**（值得肯定，整改时应保留）：

- `request.js` 是高质量的结构化请求层（ApiError 四分类、Abort 合并、超时竞速），api 层有统一地基；
- `cornieBlink.js`、`syncSignals.js`、4 个 composables 说明逻辑抽取意识存在；
- 无未引用的死组件（扫描通过）；退役动作（MemoryPageList）确实执行了删除而非注释保留。

### D. 规范文档与质量基建 —— ❌ 前端是空白区

| 项 | 状态 |
| --- | --- |
| `criterion/` 规范覆盖 | 仅 backend-api / commit-message / doc 三份，**无前端编码规范** |
| ESLint / Prettier / Stylelint | **均未安装**；`npm run lint` = `echo "(no lint configured)"` |
| SFC 写法一致性 | ✅ 33/33 使用 `<script setup>`，33/33 scoped style，props/emits 声明齐全——这是靠自觉维持的，无工具兜底 |
| 测试基建 | ✅ 22 个前端测试文件，113 用例全过；含 a11y、race-guard、polling-timers、dead-interaction 等专项，方向专业 |
| 测试覆盖面 | 流程级覆盖为主（app-diary-flow、memory-page-user-flow 等），大组件（LedgerHome 956 行、MemoryPageDetail 885 行）内部分支覆盖有限 |
| 清洁度脚本 | check-repo-cleanliness 只管 tmp/sqlite 工件；scan-unused-components 已有但未接入 lint 主流程 |

---

## 5. 风险排序（"不满意"的根源按影响排序）

1. **P0 – 无静态检查**：死导入已经出现，token 违例、未用变量、Vue 反模式全部无人拦截 → 劣化只进不出。
2. **P0 – Token 刻度缺失**：18 种字号、246 处 rgba 手调 → 视觉不一致是这个架构下的必然产物，逐页修样式永远修不完。
3. **P1 – 无基础组件库**：8 份卡片三件套副本 → 每次改版都是 8 处联动成本，也是文案/间距走样的直接来源。
4. **P2 – 手写路由 + 事件接线**：App.vue 的 v-if 链与四连赋值接线随模块数线性膨胀，新模块接入成本高、回归面大。
5. **P3 – 双入口/单文件 api 等结构性冗余**：不阻塞日常开发，但持续增加理解成本。

---

## 6. 整改路线图（映射 task 文化，可直接分发）

| 批次 | 内容 | 验收口径 |
| --- | --- | --- |
| **F-01（P0）** | 接入 ESLint（vue/essential + no-unused-vars）+ Prettier + Stylelint；修复现存违例（含 App.vue 死导入）；`lint` 进 test:fast | `npm run lint` 真实执行且零告警 |
| **F-02（P0)** | 建立 `styles/tokens.css` 完整刻度：字号阶（11/12/13/14/16/18/20/24…命名 --font-*）、间距阶、圆角阶、阴影、z-index、动效时长；颜色 alpha 统一 `color-mix(in srgb, var(--x) N%, transparent)` 方案 | Stylelint 规则禁止组件内新增 hex/rgba 字面色 |
| **F-03（P1）** | 抽取 `components/ui/`：BaseCard(Head/Title)、BaseEmpty、BasePanel、AppModal、BaseTag；先从 8 处 workspaceCard 三件套与 7 处 emptyDetail 收敛 | 上述重复定义归一为 ≤1 处；现有测试全绿 |
| **F-04（P1)** | 新增 `criterion/Cornie-frontend-coding规范.md`：目录结构、SFC 块顺序、类命名法（定一种）、composable 约定、api 拆分约定 | 与 backend-api 规范同格式入库 |
| **F-05（P2）** | vue-router（hash 模式）替换 App.vue v-if 链与子视图栈字符串；导航态持久化；跨模块跳转改路由参数 | 刷新后停留在原模块；App.vue <150 行 |
| **F-06（P2）** | api.js 按 7 域拆为 `api/` 目录，index 桶导出保持兼容 | 对外 import 路径不变，测试不改 |
| **F-07（P3）** | 记忆 Wiki Home/Workspace 双入口归一决策；MemoryWikiWorkspace（1205 行）按 head/tree/content/governance 拆分 | 单文件 <500 行 |

**建议节奏**：F-01/F-02 是一切的地板，先于任何视觉重构；没有 F-01，F-03 抽出来的组件也会被再次写歪。

---

## 7. 附录：量化快照

- renderer 总量：49 文件 / 14,075 行；最大组件 MemoryWikiWorkspace 1205 行（样式占 26%）、LedgerHome 1069 行（样式占 33%）、MemoryPageDetail 984 行（样式占 39%）——三大件的样式块占比说明"结构-样式耦合"普遍。
- token 引用密度头部：LedgerHome 34 次 vs 尾部 MemoryWikiWorkspaceHead 1 次；分布极不均匀，无规则约束。
- 前端测试基线：18 文件 / 113 用例 / 23.5s 全过（见 `baseline-test.log` 于仓库内记录）。
