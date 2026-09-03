# Diary 模块重写规格

> 目标：为「一次性全量重写为 React + TypeScript + Mantine 9」提供 Diary 模块的前期规格盘点。
> 依据代码：`src/renderer/components/{DiaryHome,DiaryEditor,CornieDiaryReview,OnThisDayPage,CornieDiaryMarkdown}.vue`、`src/renderer/api/diary.js`、`src/renderer/utils/date.js`、`src/renderer/lib/utils.js`，并交叉核对了 `src/renderer/{App.vue,router.js,request.js}`、`src/renderer/api/{index,shared,observe}.js`、`src/renderer/composables/useRequestGuard.js`、后端 `electron/backend/diary/{routes,service}.js`、`electron/db.js`（用于核实响应字段，防编造）。
> 本文档只盘点现状，不改源码。

---

## 1. 组件清单与职责

### 1.1 DiaryHome.vue（约 286 行，日记模块首页）

- **职责**：日记模块落地页。加载「今天」的日记条目做双栏预览（我的 / Cornie），展示当天观察（R-08）与「往年今日」摘要，并提供三个入口按钮。
- **依赖**：`../api`（`getEntry`、`listOnThisDay`、`listObservations`）；`./CornieDiaryMarkdown.vue`；`./ui/UiButton.vue`、`./ui/UiCard.vue`。
- **对外事件（emit）**：`go`（值为 `'editor' | 'cornie-review' | 'on-this-day'`）、`go-observe`；由 `App.vue` 的 `navHandlers` 统一接线到 `router.push`。
- **要点**：
  - 自带局部工具 `pad2` / `toISODate`（与 `utils/date.js` 的 `today()` 重复实现，重写时应收敛）。
  - `onMounted` 串行三个请求，**全部 catch 静默吞错**（失败一律渲染成空态文案，用户无法区分「没数据」和「加载失败」）。
  - 观察条目截断 `content` 前 50 字符；往年今日截断前 60 字符。

### 1.2 DiaryEditor.vue（约 421 行，双栏编辑器）

- **职责**：按日期写/改日记的编辑器。左侧「本月条目」日期列表（带 我的/Cornie 小徽标），右侧「我的日记」+「Cornie 的日记」两个 textarea，底部「往年今日」双栏回顾面板；顶栏含月份切换、回到今天、保存、让铃湾写一篇（重新生成 Cornie 日记）。
- **依赖**：`../api`（`getEntry`、`listEntries`、`listOnThisDay`、`regenerateCornie`、`upsertEntry`）；`../composables/useRequestGuard`（FE-05 竞态守卫）；`./ui/UiButton.vue`、`./ui/UiCard.vue`。
- **对外事件**：`back`（→ `/diary`）。
- **要点**：
  - `selectedDate`（默认今天）/ `selectedMonth`（默认当月）双状态；`watch(selectedDate)` → `loadEntry + loadOnThisDay`，`watch(selectedMonth)` → `refreshList`。
  - **竞态守卫只覆盖 `loadEntry`**（key `'entry'`：begin → AbortSignal 传给 `getEntry` → 响应前 `isCurrent` 校验 → finally 复位 loading）。`loadOnThisDay`、`save`、`regenCornie` **均无守卫**。
  - `dirty` 标志：textarea `@input` 置 true；仅 `save()` 成功或 `loadEntry()` 成功时复位。「保存」按钮 `:disabled="saving || !dirty"`。
  - 月份切换用原生 `<input type="month">`（Electron/Chromium 支持）。
  - 错误显示为页面内红色 banner（`errorMsg`），不弹 toast。

### 1.3 CornieDiaryReview.vue（约 193 行，Cornie 日记回顾/审查页）

- **职责**：按月列出「有 Cornie 文本」的日记卡片（`filter(e => e.hasCornieText)`），点击卡片在页面下方展开完整 Cornie 日记详情。
- **依赖**：`../api`（`listEntries`、`getEntry`）；`./CornieDiaryMarkdown.vue`；`./ui/UiButton.vue`。
- **对外事件**：`back`。
- **要点**：
  - 列表卡片摘要用 `<CornieDiaryMarkdown :content="e.cornieText || '暂无内容'" :heading-level="0" />`（`headingLevel=0` 让标题全部降级为 div，避免 button 内嵌套 h1-h3），并用 `-webkit-line-clamp: 5` 截断。
  - `openEntry` 用 `detailLoading` 防重复点击，但**无竞态守卫**（快速切月+点卡片可能旧响应后到覆盖）。
  - 月份切换同样用原生 `<input type="month">`，`@change="refresh"`。
  - ⚠️ **依赖了后端不返回的字段**：卡片摘要读 `e.cornieText`，但 `GET /entries` 后端只返回 `{date, hasUserText, hasCornieText}`（见 §3），摘要因此永远显示「暂无内容」（现存 bug，重写时必须决策：后端补字段或前端展开时再取详情）。

### 1.4 OnThisDayPage.vue（约 149 行，往年今日全页）

- **职责**：以「今天」为基准展示全部往年今日（limit 20），每张卡双栏：我的日记（纯文本 pre-wrap）+ Cornie 日记（Markdown 渲染）。
- **依赖**：`../api`（`listOnThisDay`）；`./CornieDiaryMarkdown.vue`；`./ui/UiButton.vue`、`./ui/UiCard.vue`、`./ui/UiEmpty.vue`。
- **对外事件**：`back`。
- **要点**：日期固定为今天，**无任何日期选择器/路由参数**；请求失败静默 → 渲染 `UiEmpty`（「暂无记录」），同样是空态与错误态不可区分。

### 1.5 CornieDiaryMarkdown.vue（约 204 行，Markdown 渲染实现）

- **职责**：渲染 Cornie 生成的日记文本。**手写迷你 Markdown 解析器（约 120 行核心逻辑），无任何外部 md 库**（无 marked/markdown-it/react-markdown 等）。
- **语法支持（完整清单，除此之外均不支持）**：
  - 标题 `#` / `##` / `###`（受 `headingLevel` prop 上限约束，超出或为 0 时降级为 `div.mdHeadingFlat`）；
  - 引用块 `> `（连续行合并为一个 blockquote，行间插 `<br />`）；
  - 无序列表 `- ` 或 `* `（**仅一级，无嵌套**，连续行为同一 ul）；
  - 段落（软换行合并为同一 `<p>`，行间插 `<br />`）；
  - 行内强调 `**粗体**`、`*斜体*`（先整体 HTML 转义再正则替换，天然防 XSS；跨行不加粗）。
- **Props**：`content: string`（默认 `''`）、`headingLevel: number`（默认 3，允许 0；0 = 全部标题扁平化为 div，用于按钮内/摘要场景）。
- **渲染结构**：解析为 blocks 数组（`{type: 'heading'|'quote'|'list'|'paragraph', ...}`），逐块 `v-html` 渲染，类名 `mdH1/mdH2/mdH3/mdQuote/mdList/mdParagraph`，容器 `.cornieMarkdown` 为 flex column gap 10px，颜色继承父容器。
- **⚠️ 结论：不含任何日记特化块**——没有「日记回顾卡片」、没有代码块/表格/图片/链接/有序列表/hr。它是通用极简 md 渲染器；Cornie 的视觉氛围（accent 色、圆角引用块）全部由**父容器**注入（如 `.reviewDetailBody`、`.cornieText` 的 `color-mix` 着色与 `:deep()` 字号覆写）。

### 1.6 api/diary.js（28 行，API 客户端）

- 5 个函数全部经 `apiFetch`（`api/shared.js` → `request.js`）：Base `http://127.0.0.1:5174/api`，默认 30s 超时，外部 AbortSignal 透传合并，非 2xx 抛结构化 `ApiError`（`kind: network|timeout|http|protocol`，message 优先取响应体 `JSON.error`），2xx 返回 `res.json()`。
- 组件统一从 `../api`（`api/index.js` 桶导出）取函数，不直连域文件。

### 1.7 utils/date.js（51 行）与 lib/utils.js（7 行）

- `utils/date.js`（Cornie-021 FE-02，全仓唯一日期工具）：`DATE_RE`（`/^\d{4}-\d{2}-\d{2}$/`）、`today()`（本地时区 `YYYY-MM-DD`）、`formatDate(dateLike)`（任意输入 → 本地日期串，非法返回 `''`）、`parseLocalDate(dateStr)`（解析为**本地时区零点** Date，且**拒绝 Date 滚动接受的伪日期**如 `2026-02-30`）。注释明文固化语义：「今天 = 本地时区日期，禁止 `new Date().toISOString()` 取日期」。
- `lib/utils.js`：仅 `cn()`（clsx + tailwind-merge），供 ui/* 基座组件合并类名；框架无关，React 重写可直接复用。
- ⚠️ **现状矛盾**：Diary 四个页面组件各自重复实现了 `pad2/toISODate/toISOMonth`，并未使用 `utils/date.js`。重写时应统一收敛到日期工具模块。

---

## 2. 状态与交互流

### 2.1 路由与参数（router.js 是唯一导航事实源，hash 模式）

| 路由 | name | 组件 |
| --- | --- | --- |
| `/diary` | `diary` | DiaryHome |
| `/diary/editor` | `diary-editor` | DiaryEditor |
| `/diary/cornie-review` | `diary-cornie-review` | CornieDiaryReview |
| `/diary/on-this-day` | `diary-on-this-day` | OnThisDayPage |

- **Diary 四个视图均无路由参数**（对比 `/chat/day/:date`、`/observe/detail/:id`）；所有日记页面的「当前日期」都是组件内部状态（默认今天），不进 URL。重写为 React Router 时需决策：保持「日期仅存组件态」或升级为 `/diary/editor?date=`（后者可恢复深链，建议采纳）。
- 导航接线：DiaryHome/DiaryEditor 等路由组件 `emit('go' | 'back' | 'go-observe')` → `App.vue` 中 `<RouterView v-slot>` 对每个路由组件统一 `v-on="navHandlers"`：
  - `go('editor')` → `router.push('/diary/editor')`；`go('cornie-review')` → `/diary/cornie-review`；`go('on-this-day')` → `/diary/on-this-day`；
  - `go-observe` → `/observe`（R-08「看全部观察」）；
  - `back`：当前路径以 `/diary/` 开头 → `router.push('/diary')`。
- React 重写建议：emit 契约改为显式 props 回调（`onNavigate(view: 'editor' | 'cornie-review' | 'on-this-day')`、`onBack()`），或直接组件内用导航 hook，废弃 App 层全局 v-on 派发。

### 2.2 编辑器草稿与保存流（DiaryEditor）

```
挂载: refreshList(month) → loadEntry(today) → loadOnThisDay(today)   （串行 await）
watch selectedDate → loadEntry(date) + loadOnThisDay(date)（并行发起）
watch selectedMonth → refreshList(month)

textarea @input → dirty = true（唯一脏标记来源，无 autosave、无离开确认）
保存: upsertEntry(selectedDate, {userText, cornieText})
      → 成功: entry = 响应 entry；dirty = false；refreshList()（重建本月列表徽标）
      → 失败: errorMsg = e.message（保留草稿，不弹窗）
重新生成: regenerateCornie(selectedDate)
      → 成功: entry = 响应 entry（整条替换！）；refreshList()；dirty 不复位
回到今天: pickDate(toISODate(new Date()))（仅改 selectedDate，触发 watch 加载）
```

- **草稿 = 本组件态 `entry`**：无本地持久化、无 beforeunload 拦截、无未保存离开确认；切换日期直接 `loadEntry` 覆盖。
- `regenCornie` 是**隐式草稿清空点**：响应的 `entry` 整体替换本地对象，用户未保存的 userText 编辑会被服务端副本静默覆盖，且 `dirty` 未复位（指示器与实际状态脱节）。
- 保存无乐观锁/无 `updatedAt` 比对，属「最后写入者胜」。

### 2.3 Cornie 审查流（CornieDiaryReview）

```
挂载: refresh(month) → listEntries → filter(hasCornieText) → 列表卡片
切月: input[type=month] @change → refresh
点卡片: openEntry(date)（detailLoading 防重入）→ getEntry(date) → activeEntry → 下方详情区 Markdown 渲染
refresh 后若 activeDate 不在新列表中 → 清空 activeDate/activeEntry
```

- 卡片摘要依赖 `listEntries` 行内的 `cornieText`（后端实际不返回，见 §1.3/§6）。
- 详情加载失败时用「伪 entry」`{cornieText: '加载失败，请稍后再试'}` 渲染，无重试按钮。

### 2.4 OnThisDay 数据来源

- DiaryHome：`listOnThisDay(today, {limit: 10})` → 取前 3 条摘要（date + 截断 60 字符的 userText/cornieText）。
- DiaryEditor：`listOnThisDay(selectedDate, {limit: 10})` → 全量展示在编辑器底部「往年今日」面板（每条双栏：我的 / Cornie，空文本显示「（空）」）；**失败时塞入哨兵项 `[{__error: message}]`** 渲染错误行（与其他页面的静默策略不一致）。
- OnThisDayPage：`listOnThisDay(today, {limit: 20})` → 卡片流。
- 后端语义（`electron/db.js listOnThisDay`）：匹配 `substr(date,6,5)`（月-日相同）的其他年份条目，排除当天，至少一侧文本非空，`order by date desc`，limit 钳制 1..200（默认 20）。返回 `items: [{date, userText, cornieText}]`。

### 2.5 请求层统一行为（request.js，重写必须等价保留）

- 默认超时 30s（可覆盖）；外部 AbortSignal 与超时合并；错误归一为 `ApiError {name, kind, status?, message, cause?}`；页面现有习惯 `catch (e) { e?.message || String(e) }`。
- `useRequestGuard`（FE-05）：按 key 维护「序号 token + AbortController」，begin 使同 key 旧调用失效；响应回调先 `isCurrent(key, token)` 再写状态；卸载时 Abort 全部在途请求。React 重写需等价物（自写 hook 或换成 TanStack Query 的 queryKey + cancellation）。

---

## 3. API 契约清单

以下路径与字段从 `src/renderer/api/diary.js` 逐函数提取，响应字段已对照后端 `electron/backend/diary/routes.js`、`electron/db.js`、`api/observe.js` 及组件实际用法核实。Base：`http://127.0.0.1:5174/api`（Electron 内嵌 Express）。

| 方法 | 路径 | 关键请求字段 | 关键响应字段 | 调用方 |
| --- | --- | --- | --- | --- |
| GET | `/entries` | query：`month`（可选，`YYYY-MM`，后端 `optionalISOMonth` 校验） | `{ entries: [{ date: string, hasUserText: boolean, hasCornieText: boolean }] }`（按 date 倒序；**不含正文**） | DiaryEditor.refreshList；CornieDiaryReview.refresh |
| GET | `/entries/:date` | path：`date`（`YYYY-MM-DD`，后端 `requireISODate`）；支持 `{ signal }` 取消 | `{ entry: { date: string, userText: string, cornieText: string } }`（无记录返回全空串条目，不 404） | DiaryHome、DiaryEditor.loadEntry、CornieDiaryReview.openEntry |
| PUT | `/entries/:date` | path：`date`；body：`{ userText: string }`（必填字符串，maxLen 50 000，空串允许）、`cornieText?: string`（可选，maxLen 50 000；**缺省时后端保留旧值**） | `{ entry: { date, userText, cornieText } }`（upsert 后全量条目） | DiaryEditor.save |
| POST | `/entries/:date/regenerate-cornie` | path：`date`；无 body | `{ entry: { date, userText, cornieText } }`（cornieText 为 LLM 新生成；**后端异步 LLM 调用，可能逼近/超过客户端 30s 默认超时**） | DiaryEditor.regenCornie |
| GET | `/entries/:date/on-this-day` | path：`date`；query：`limit`（可选数字，后端钳制 1..200，默认 20） | `{ items: [{ date: string, userText: string, cornieText: string }] }`（月-日匹配的其他年份，date 倒序） | DiaryHome、DiaryEditor.loadOnThisDay、OnThisDayPage |
| GET | `/observations`（observe.js，DiaryHome R-08 联动） | query：`date`（`YYYY-MM-DD`）、`limit`（DiaryHome 传 3），另支持 `from/to/type/q` | `{ observations: [{ id: string, date, type, title: string, content: string, ... }] }` | DiaryHome（当天观察卡） |

调用侧统一错误契约：所有函数 reject `ApiError`，message 可直接展示；外部取消抛原生 `AbortError`（调用方应静默）。

---

## 4. UI → Mantine 9 组件映射表

可用资源：`@mantine/core`（含 EmptyState、Table、Tabs、Modal、Drawer、Timeline、ScrollArea、SegmentedControl、Menu、Pill、TagsInput）、`@mantine/dates`、`@mantine/notifications`、`@mantine/form`、`@mantine/hooks`。

### 4.1 基座组件（ui/*）与通用元素

| 现有元素/自研组件 | Mantine 组件 + props 要点 | 备注 |
| --- | --- | --- |
| `UiButton`（variant：default/outline/secondary/ghost/link/destructive/dangerGhost） | `Button`：default→`variant="filled"`，outline→`variant="default"`，secondary→`variant="light"`，ghost→`variant="subtle"`，destructive/dangerGhost→`color="red"` + filled/subtle，link→`variant="transparent"` 或 `Anchor`；按钮 loading 态用 `loading={saving}` | 现有 loading 文案「保存中…」「生成中…」可改用 `loading` 属性自动 spinner |
| `UiCard`（head: title/subhint/actions 三槽 + body） | `Card`（`padding="lg" withBorder radius="xl"`）+ 头部用 `Group justify="space-between"` 组合 `Title`/`Text c="dimmed"`/actions；或直接 `Paper` | Diary 大量卡片自定义 padding（16-24px），用 `p` prop 控制 |
| `UiEmpty`（icon emoji + text + action slot） | `EmptyState`（Mantine 9 新组件）：`icon` / `title` / `description` / `action` | OnThisDayPage 直接替换；虚线边框风格用 `style`/`className` 微调 |
| 原生 `<textarea>`（日记编辑） | `Textarea`（`autosize minRows maxRows`），受控 `value` + `onChange`；dirty 逻辑放 onChange | 两个编辑面板各一 |
| 原生 `<input type="month">`（DiaryEditor / CornieDiaryReview） | `@mantine/dates` 的 `MonthPickerInput`（`valueFormat="YYYY-MM"`，`value`/`onChange`；`valueType` 按需），或 `Select` 预生成月份 | **需处理 Date ↔ `YYYY-MM` 字符串转换**，见 §6 时区坑 |
| 侧栏「本月条目」日期行按钮（hover/active 高亮） | `ScrollArea.Autosize` 包 `UnstyledButton` 列表；active 态 `data-active` + `styles`/`variant` | 也可用 `Table highlightOnHover` 或 `NavLink` |
| `datePills`（我的 / Cornie 小徽标） | `Badge variant="light" size="sm"`（Cornie 用 accent 色）或 `Pill` | Badge 更贴近现有小尺寸语义 |
| 顶部状态行「已同步 / 未保存更改 / 加载中…」 | `Text c="dimmed" size="sm"` 或 `Badge`（dirty 时变色） | 保留文案 |
| `errorMsg` 红色 banner | `Alert color="red" variant="light"`（可 `withCloseButton`）；瞬时反馈可另用 `notifications.show` | 现状为持久 banner，建议保留 Alert |
| 「加载中…」文本 | `Loader size="sm"` + `Text c="dimmed"`，或卡片级 `LoadingOverlay` | |
| 双栏栅格（previewGrid / otdGrid / otdCols） | `SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm"` | 替代现有 CSS grid + @media 断点 |
| 滚动容器 + 自定义 ::-webkit-scrollbar | `ScrollArea` / `ScrollArea.Autosize`（type="hover"） | 全模块多处 |
| 「← 返回日记首页」按钮 | `Button variant="subtle" leftSection={<IconArrowLeft />}`（tabler icons） | |

### 4.2 CornieDiaryMarkdown 渲染块

| 现有块/类名 | Mantine 组件 + props 要点 | 备注 |
| --- | --- | --- |
| `.cornieMarkdown` 容器（flex column gap 10px） | `Stack gap="sm"` | 颜色继承由父容器控制 |
| `mdH1/mdH2/mdH3`（自定义字号 1.14/1.02/0.96rem，weight 800） | `Title order={1|2|3}`（用 `style`/theme heading 覆写字号） | 需保留 `headingLevel` 降级语义（0 → `Text fw={800}` 扁平 div） |
| `mdParagraph`（line-height 1.8，软换行 `<br/>`） | `Text lh={1.8}` | |
| `mdQuote`（左边框 3px + 半透明底 + 右圆角） | `Blockquote`（`color`/`icon` 可空化；用 `styles` 覆写 padding/背景） | Blockquote 是最贴合的现成组件；视觉差异用 styles 收敛 |
| `mdList`（一级 ul，gap 6px） | `List spacing={6} withPadding`（`listStyleType="disc"`） | |
| `**bold**` / `*em*` | 行内 `<strong>/<em>`（`Text` 内嵌 span），无对应 Mantine 组件 | 解析器必须自写（§5） |
| 摘要 5 行截断（-webkit-line-clamp） | `LineClamp clamp={5}`（@mantine/core） | CornieDiaryReview 卡片摘要 |

### 4.3 Markdown 方案评估结论

- Mantine 9 **无内置 Markdown 渲染**，需自建或引第三方（react-markdown + remark）。现有解析器约 120 行、语法面极窄（§1.5），且「先转义后替换」的安全性设计是重写时必须原样保留的约束。**推荐：将解析器移植为纯 TS 函数 + React 渲染组件**（零新依赖、行为逐块等价、可单测 blocks 快照）；react-markdown 方案仅在重写后计划扩展语法（表格/代码块/链接）时再评估，且需注意它会放宽语法面、改变「Cornie 文本」的既定渲染预期。

---

## 5. 必须自写的部分

1. **Markdown 渲染器（CornieDiaryMarkdown 的 React/TS 移植）**——唯一必须自写的渲染件，要点：
   - 逐行解析为 blocks：空行触发 flush（paragraph/list/quote 三缓冲）；`^(#{1,3})\s+` 标题；`^>\s?` 引用（连续行合并）；`^[-*]\s+` 一级无序列表；其余入段落缓冲（行间 `<br/>`）。
   - **转义优先**：先 `escapeHtml`（`& < > " '` 五字符）再做 `**…**`→strong、`*…*`→em 的行内替换；v-html 等价物为 `dangerouslySetInnerHTML`，**绝不能先替换后转义**。
   - `headingLevel` 语义：0-3 上限，超限/为 0 时标题降级为 div（`mdHeadingFlat`）——Review 卡片摘要（button 内）依赖此行为避免非法 HTML 嵌套。
   - 不支持的语法（代码块/表格/图片/链接/有序列表/嵌套列表）**不解析也不转义特殊符号之外的内容**，按普通段落原样展示——重写需保持该「按原文显示」的降级行为，不要擅自引入新语法。
   - **特化块结论：无。** 现实现不存在日记回顾卡片等自定义块类型；如重写想增加（如把往年今日摘要渲染为卡内嵌卡片），属于新需求而非迁移。
2. **请求守卫 hook**：`useRequestGuard` 的 React 等价物（key → {token, AbortController}，卸载全量 abort），或引入 TanStack Query 用 queryKey + signal 取代——二选一，但 **DiaryEditor 目前只守卫了 loadEntry，重写应把 loadOnThisDay/save/regen 也纳入**（§6）。
3. **日期工具 TS 移植**：`today()/formatDate()/parseLocalDate()/DATE_RE` 原样迁移（本地时区语义 + 伪日期拒绝），并**强制四个页面组件改用统一工具**，删除各自重复的 `pad2/toISODate/toISOMonth`。
4. **路由 emit → 回调适配**：`go/back/go-observe` 事件契约转成 props 回调或路由 hook（§2.1）。
5. **`cn()`**：`clsx + tailwind-merge` 框架无关，可直接保留；若重写后改用 Mantine style props，可逐步退役。

---

## 6. 边界与坑

1. **草稿丢失（最高优先级）**
   - 切换日期（点侧栏/回到今天）直接 `loadEntry` 覆盖 `entry`，未保存编辑**无确认直接丢弃**；dirty 仅是显示态，无拦截。
   - `regenCornie` 成功后 `entry.value = data.entry` 整体替换：未保存的 userText 编辑被服务端副本覆盖（草稿静默清空），且 `dirty` 不复位——状态指示与内容脱节。
   - 无 beforeunload/路由离开守卫、无本地草稿持久化。重写建议：切换/重生成前 `dirty` 时弹 `Modal confirm`（Mantine `Modal` + 确认文案），或加 localStorage 草稿恢复。
2. **并发与竞态**
   - 仅 `loadEntry` 有 FE-05 守卫；`loadOnThisDay`（快速切日期可能旧 items 后到覆盖新日期面板，甚至出现 `__error` 哨兵误挂新日期）、`save`、`regenCornie`、`CornieDiaryReview.openEntry` 均无守卫。
   - 保存与加载可交错：loadEntry 在途中点保存 → 响应互相覆盖；保存是「整条 PUT」（userText+cornieText 一起提交），两个并发写最后者胜，无 updatedAt 乐观锁。
   - `regenerate-cornie` 是 LLM 长任务但走 30s 默认超时——超时即 `ApiError('timeout')`，而服务端生成可能仍会完成并落库，前端再点「保存」会把旧 cornieText 写回（覆盖刚生成的内容）。重写建议：regen 单独放宽 timeoutMs/轮询状态，且 regen 成功后强制刷新 entry。
3. **日期与时区**
   - 全链路日期键是本地时区 `YYYY-MM-DD` 字符串；`parseLocalDate` 明确拒绝 `new Date('YYYY-MM-DD')`（按 UTC 解析会跨日）与伪日期（2026-02-30）。重写若引入 `@mantine/dates`，**valueFormat 输出后必须走同一解析/格式化工具**，不得混用 `toISOString().slice(0,10)`。
   - `<input type="month">`（`YYYY-MM` 字符串）→ Mantine `MonthPickerInput`（Date 或字符串，取决于 valueFormat/valueType）需要显式转换层；这是月列表查询（`?month=YYYY-MM`）的入参，格式错会静默查空。
   - 现状四个组件各自手写 `toISODate` 未用统一工具，属于待收敛的技术债（§5.3）。
4. **空态与错误态不可区分**
   - DiaryHome / OnThisDayPage / CornieDiaryReview 全部 `catch {}` 吞错：网络失败与「真的没数据」渲染同一文案（「暂无记录」「还没有观察」），用户误以为无历史。重写建议区分 `EmptyState`（空）与错误 Alert + 重试按钮。
   - DiaryEditor 的 OTD 面板用 `__error` 哨兵对象混入 items 数组渲染错误行——类型脏 hack，重写时应改为独立 error 状态。
   - `GET /entries/:date` 对不存在日期返回全空串条目（不 404），空态判定应基于文本是否 trim 为空（与 `hasWritten` computed 一致）。
5. **现存前后端契约不一致（重写时必须决策的 bug）**
   - `CornieDiaryReview` 卡片摘要读取 `GET /entries` 行内 `cornieText`，但后端 `listEntries` 只返回 `{date, hasUserText, hasCornieText}`，摘要恒为「暂无内容」。修复方向二选一：后端列表补 `cornieText` 字段（数据量考量），或前端改为「展开时才取详情」的交互。
6. **PUT 校验细节**：`userText` 后端必填（`requireString`，maxLen 50 000）；前端总是同时提交两字段所以安全，但重写后若做「仅保存我的日记」需注意**省略 cornieText 字段 = 保留旧值**这一语义（不是清空）。
7. **小细节**：`limit` 只在 truthy 时拼接 query（DiaryHome 传 10/3，OnThisDayPage 传 20）；`listOnThisDay` 服务端钳制 1..200。摘要截断（50/60 字符）无省略号统一处理，硬切 `…`。
