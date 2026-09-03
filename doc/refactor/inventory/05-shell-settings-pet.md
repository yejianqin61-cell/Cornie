# 外壳 / 设置 / 桌宠 / 基建 重写规格

> 盘点范围：应用外壳（App.vue）、路由（router.js）、HTTP 基建（request.js / api/shared.js / api/model.js）、跨窗口信号（syncSignals.js）、桌宠窗口（CorniePet.vue / cornieBlink.js / cornieConfig.js）、Electron IPC 桥（preload.cjs / main.js）、设置三页（SettingsHome / DeepseekConfig / AdvancedSettings）、全局 Token（tokens.css / style.css）。
>
> 所有契约均从当前源码逐项提取，行数为工作区实测；"React 版建议"为迁移建议，与源码事实分开陈述。
>
> ⚠️ **基线快照警告**：本文档撰写时（基于 2026-09-03 15:51 的 Vue 基线），工作区已出现**并行进行中的 React 迁移文件**（16:06–16:27 陆续生成：`theme/theme.ts`、`request.ts`、`api/*.ts`×10、`hooks/useRequestGuard.ts`、`hooks/useTimers.ts`、`hooks/useModelSettings.ts`、`syncSignals.ts`、`main.tsx`、`router.tsx`、`App.tsx`、`cornieMain.tsx`）。本文描述的是 **Vue 基线契约**，用作 React 版的对照与验收依据；基建与外壳的 .tsx 孪生已存在，桌宠（CorniePet.tsx）尚未出现。

---

## 1. 文件清单与职责

### 1.1 盘点目标文件

| 文件 | 行数 | 职责 | 关键依赖 |
| --- | ---: | --- | --- |
| `src/renderer/App.vue` | 404 | 应用外壳：左侧导航 + 顶部栏 + 路由视图 + 配网引导遮罩；子视图 emit → router.push 的集中接线；模型状态顶栏指示 | `vue-router`、`useModelSettings`、`UiButton` |
| `src/renderer/router.js` | 56 | 路由唯一事实源：17 条业务路由 + 2 条重定向，hash 模式 | `vue-router`（createWebHashHistory）、17 个页面组件 |
| `src/renderer/request.js` | 174 | HTTP 请求层：超时、外部 Abort 合并、错误归一化（ApiError 分类） | 无（纯 fetch + DOM） |
| `src/renderer/syncSignals.js` | 65 | 跨窗口/跨模块数据变更信号：本地 CustomEvent + IPC 广播双通道；tool_name → 领域映射 | `window.cornieDesktop`（preload） |
| `src/renderer/cornieConfig.js` | 57 | 桌宠部件布局固化数据：舞台尺寸、整体变换、4 个部件坐标、CSS 变量组、眼睛覆盖层 | 无（纯数据） |
| `src/renderer/CorniePet.vue` | 602 | 桌宠窗口唯一组件：表情状态机、展开面板（消息列表/通知/输入栏）、置顶/停留/发送按钮、IPC 拖拽 | `useChat`、`utils/date`、`window.cornieDesktop` |
| `src/renderer/cornieBlink.js` | 84 | 眨眼动画控制器（半闭→闭合→半闭时序 + 头部微沉 + 随机间隔/双眨） | 无（回调注入式） |
| `src/renderer/components/SettingsHome.vue` | 111 | 设置首页：连接状态卡、DeepSeek 配置入口、数据与隐私说明卡、高级设置入口 | `UiButton`、`UiCard`；props 注入 modelStatus/modelSettings |
| `src/renderer/components/DeepseekConfig.vue` | 146 | DeepSeek 配置表单：4 字段 + 保存并检测/只检测/清空钥匙 | `useModelSettings`、`UiButton` |
| `src/renderer/components/AdvancedSettings.vue` | 143 | 高级设置：高级模式开关 + 6 张功能卡（仅 memory-wiki 实接，其余占位） | `MemoryWikiWorkspace`、`UiButton`、`UiEmpty` |
| `src/renderer/api/index.js` | 14 | API 客户端桶导出：`apiFetch`/`ApiError` + 9 个域模块 `export *` | 全部域文件 |
| `src/renderer/api/model.js` | 22 | 模型状态/设置 4 个端点封装 | `api/shared.js` |
| `src/renderer/api/shared.js` | 18 | 统一请求入口：`API_BASE` 硬编码 + 默认头 + 204→null | `request.js` |
| `electron/preload.cjs` | 22 | contextBridge 暴露 `window.cornieDesktop`：8 个方法（拖拽 3 + 开窗 1 + 置顶 2 + 广播 2） | `electron`（ipcRenderer） |
| `electron/main.js` | 197 | 主进程：双窗口创建、本地 API 启动（5174）、拖拽三事件处理、always-on-top、data-changed 广播 | `electron`、`./db.js`、`./server.js`、`./win32/desktopLayer.js` |
| `src/renderer/styles/tokens.css` | 141 | 全部设计 token：Tailwind 4.3 `@theme static` 发射规范名 + 旧名兼容层 + 桌宠 pet-* 组 | `tailwindcss/theme`、`tailwindcss/utilities` |
| `src/renderer/style.css` | 127 | 全局元素样式（@layer base）：body 字体/背景、`body.transparent`、button/input/textarea/.card 基样式 | `tokens.css` |

### 1.2 契约相关支撑文件（本文引用其行为，不单独盘点）

| 文件 | 行数 | 与本盘点的关系 |
| --- | ---: | --- |
| `src/renderer/main.js` | 6 | 主窗入口：`createApp(App).use(router).mount('#app')` + `style.css` |
| `src/renderer/cornieMain.js` | 8 | 桌宠入口：`document.body.classList.add('transparent')` 后挂载 CorniePet（不装路由） |
| `src/renderer/composables/useModelSettings.js` | 122 | 模型设置单一状态源，App 引导横幅与 DeepseekConfig 共用（§3.5） |
| `src/renderer/composables/useChat.js` | 386 | CorniePet 的对话数据源：3s 轮询同步、防重入、visibilitychange 补同步（§4.4） |
| `src/renderer/CornieComposer.vue` | 451 | `cornieBlink`/`cornieConfig` 的唯一消费方（部件贴图形象 + 眨眼预览编辑器），主窗内使用，非桌宠窗口入口 |
| `vite.config.ts` | 37 | 双入口构建：`input: { main: index.html, cornie: cornie.html }`；React 插件已启用 |
| `index.html` / `cornie.html` | 12 / 15 | 双入口 HTML；cornie.html 内联 `html,body{background:transparent}` 且 `<body class="transparent">` |
| `electron/main.cjs` | 6 | package.json `main` 指向它，仅 `void import('./main.js')` 桥接到 ESM 主进程 |

### 1.3 运行时事实（来自 package.json / electron/main.js）

- 主进程入口 `electron/main.cjs` → 桥接 ESM `electron/main.js`；`isDev = !app.isPackaged`。
- 本地 API：`serverInstance = api.listen(5174, '127.0.0.1')`；SQLite 在 `userData/cornie.sqlite3`。
- 开发：`concurrently` 起 vite（`127.0.0.1:5173`，strictPort，predev kill-port 5173/5174）+ wait-on 后启动 Electron；主窗 dev 载 `http://127.0.0.1:5173` 并 detach 打开 DevTools；桌宠 dev 载 `http://127.0.0.1:5173/cornie.html`。
- 生产：主窗 `loadFile(dist/index.html)`、桌宠 `loadFile(dist/cornie.html)`。
- 依赖现状：`react@19.1`、`react-dom@19.1`、`react-router-dom@7.6`、`@mantine/core|dates|form|hooks|notifications|schedule@9.0`、`@tabler/icons-react`、`@vitejs/plugin-react` 均已安装；Vue 运行时依赖（`vue`/`vue-router`）**未在 dependencies 中出现**（Vue 版由存量源文件直接工作，重写期间不可回退依赖它）。

---

## 2. 应用外壳设计（App.vue 基线 → React AppShell）

### 2.1 布局结构（源码提取）

```
.appShell                       height:100vh; grid; grid-template-columns: 260px minmax(0,1fr); gap:16px; padding:16px
├─ nav.navPanel                 260px 左栏，圆角 20px 卡片（border/surface），flex column
│  ├─ .brandBlock               标题「铃湾」(--text-2xl/800) + 副题「Cornie」(--text-sm/muted)
│  ├─ .navList                  8 个 navItem（button），竖排 gap 6px，flex:1 可滚动
│  │   └─ .navItem              圆角 14px；hover→--surface-2；active→rgba(232,133,106,0.1)（accent 10% 透明）
│  │                            结构：.navIcon(emoji 20px) + .navText(.navLabel 700/--text-md + .navHint --text-xs/muted)
│  └─ .navFooter                上边框分隔；.statusDot（8px 圆点 + 文案）
│                               modelStatus.ok → 「铃湾在线」(--success)；否则「未连接」(--muted)
└─ main.mainPanel               flex column（tabindex=-1，FE-10 路由切换后聚焦，outline:none）
   ├─ header.topBar             圆角 14px 卡片：.topTitle（modeMeta.label，--text-2xl/800）+ .topHint（modeMeta.hint）
   ├─ section.guideBanner       v-if="!modelStatus.configured" 时显示（见 2.6）
   └─ section.contentFrame      v-else，flex:1 容纳 <RouterView>
```

响应式：`≤1180px` 壳层变单列、高度改 auto、navList 变两列 grid；`≤760px` navList 单列、topBar 纵排、引导表单单列。

### 2.2 导航项（8 项，路由驱动，active 判定 `route.path.startsWith(item.path)`）

| path | label | hint（副文案） | icon |
| --- | --- | --- | --- |
| `/chat` | 聊天 | 和铃湾说说话 | 💬 |
| `/diary` | 日记 | 写下今天的心情 | 📔 |
| `/ledger` | 收支 | 轻松记一笔 | 💰 |
| `/todo` | 待办 | 今天要做什么 | ✅ |
| `/schedule` | 日程 | 接下来的安排 | 📅 |
| `/observe` | 观察日志 | 今天留下的生活片段 | 📝 |
| `/memory` | 记忆 Wiki | 想留住的长期记忆 | 📖 |
| `/settings` | 设置 | 铃湾的连接和偏好 | ⚙️ |

顶部栏的 `modeMeta` = 第一个 `route.path.startsWith(item.path)` 命中的导航项（未命中回落 `sections[0]`）——**顶栏标题/副题由当前路由前缀推导，不是每页自己写**。

### 2.3 当前路由如何渲染（RouterView 接线契约）

```html
<RouterView v-slot="{ Component }">
  <component :is="Component" v-bind="routeExtraProps" v-on="navHandlers" />
</RouterView>
```

- **routeExtraProps**：仅当 `route.path === '/settings'` 时注入 `{ modelStatus, modelSettings }`（设置首页不自己拉状态，由壳层持有）。其余路由无额外 props。
- **navHandlers**：所有路由组件共享的 emit 契约（`v-on` 注入），映射如下——

| 事件 | 参数 | 行为 |
| --- | --- | --- |
| `go-history` | — | → `/chat/history` |
| `back` | — | 智能返回（见下） |
| `open-date` | `date` | `/chat/day/${date || ''}` |
| `go` | `view, id` | `observation-list`→`/observe/list`；`observation-detail`→`/observe/detail/:id`；`editor`→`/diary/editor`；`cornie-review`→`/diary/cornie-review`；`on-this-day`→`/diary/on-this-day` |
| `go-observe` | — | `/observe` |
| `go-chat` | — | `/chat` |
| `open-observation` | `id` | `/observe/detail/:id` |
| `open-chat-source` | `{date, messageId}` | 有 date → `/chat/day/:date?focus=:messageId`；否则 `/chat/history` |
| `deleted` | — | `/observe/list` |
| `updated` | — | `refreshModelState()`（刷新顶栏在线状态） |

- **handleBack 分支**：`/chat/day*`→`/chat/history`→`/chat`；`/diary/*`→`/diary`；`/observe/detail*`→`/observe/list`→`/observe`；`/settings/*`→`/settings`；兜底→`/chat`。
- **焦点管理（FE-10）**：watch `route.path` → `nextTick` 后聚焦 `mainPanel`（`tabindex="-1"`，`.mainPanel:focus{outline:none}`，容器只接收焦点不显示高亮）。

### 2.4 data-changed 信号如何分发给各模块

**壳层（App.vue）不订阅 `cornie:data-changed`**。分发模型是「发射源 → 本地事件总线 → 各模块自订阅」：

1. **唯一发射源**：`useChat.notifyDataChanged(results, source)`（`src/renderer/composables/useChat.js` L51–55）。聊天/确认流的服务端响应携带 `toolExecution.results` 时，`collectChangedDomains` 归纳出变更领域，非空才 `emitDataChanged({ source, ...changed })`。实测两个发射点：`'chat'`（发送回复后）与 `'confirmation'`（确认决策后）。
2. **信号模块**（syncSignals.js）把 detail 派发为 `window` 级 CustomEvent（`cornie:data-changed`），并经 `window.cornieDesktop.broadcastDataChanged` 交主进程广播给**其它窗口**（主窗↔桌宠互见）。
3. **订阅方**（5 个，模式统一）：

```js
// TodoHome.vue / LedgerHome.vue / ScheduleHome.vue / ObserveMemoryHome.vue / MemoryWikiHome.vue
let stopListening = () => {}
onMounted(() => {
  refresh()
  stopListening = listenDataChanged((detail) => {
    if (detail?.todo) refresh()   // 各自只认领自己的领域布尔位
  })
})
onBeforeUnmount(() => stopListening())
```

4. **壳层内唯一联动**：`navHandlers.updated`（DeepseekConfig 保存/清空成功后 `emit('updated')`）→ `refreshModelState()` → 顶栏在线状态点与引导横幅可见性刷新。
5. **引导横幅可见性**：`isGuideVisible = !modelStatus.configured`，`onMounted` 时 `refreshModelState()` 一次。

### 2.5 React 版 AppShell 建议

- **骨架**：`MantineProvider`（`forceColorScheme="light"`）+ `AppShell`，保留现「浮动圆角面板」观感：
  - `AppShell.Navbar`（width 260，`collapsed={{ mobile: !opened }}`）：brand 区 + `NavLink`×8（`label`/`description`=hint/左 icon，`active` 用 `useLocation().pathname.startsWith(path)`，点击 `navigate(path)`）+ 底部状态（`Badge` 圆点：在线/未连接）。
  - `AppShell.Header`（高约 56）：`Burger`（≤760px 显示，配 `useDisclosure`）+ `modeMeta.title/hint`（由路由前缀推导的逻辑保持不变，集中为一个 `useModeMeta()` 工具）。
  - `AppShell.Main`：未配置模型 → 引导横幅（`Alert` + `PasswordInput`/`TextInput`，行为见 §3.5）；否则 `<Outlet />`。
- **路由**：`createHashRouter`（必须 hash，见 §7.2）按 §7 保留 17 条路由表；`/settings` 的 `modelStatus/modelSettings` 注入改为 `<Outlet context={...}>` + `useOutletContext`，或让 SettingsHome 直接消费全局模型设置 store。
- **navHandlers 迁移**：这是 Vue 版最大的隐性契约。建议逐页改为声明式导航（组件内 `useNavigate` + `<Link>`），删除字符串事件接线；`back` 的分支逻辑抽成纯函数 `resolveBackPath(pathname)` 保留行为。⚠️ 顺带修复现存缺口：SettingsHome 发出的 `go: 'deepseek-config'` / `go: 'advanced'` 在 App.vue `handleGo` 中**没有对应分支**（见 §7-6）。
- **可选**：`NavigationProgress` 挂路由切换/loading 请求的顶部进度；`focus` 管理用 ref + `useEffect(() => { mainRef.current?.focus() }, [pathname])` 保留 FE-10 行为。
- **响应式**：≤1180px 的「导航折叠到顶部」行为可由 AppShell navbar breakpoint 承接，导航 2 列网格观感用 NavLink 容器 CSS 还原。

---

## 3. 基建层契约

### 3.1 request.js — HTTP 请求层

**导出清单**（源码逐项）：

| 导出 | 签名 | 语义 |
| --- | --- | --- |
| `DEFAULT_TIMEOUT_MS` | `30_000` | 默认超时，调用方可覆盖 |
| `ApiError` | `class extends Error`；字段 `{name:'ApiError', kind, message, status?, cause?}` | 结构化错误；`kind: 'network' \| 'timeout' \| 'http' \| 'protocol'`（`protocol` 由上层流式解析保留，本模块不会产生） |
| `isAbortError(err)` | → bool | `err?.name === 'AbortError'`（外部主动取消） |
| `createAbortContext({signal, timeoutMs})` | → `{signal, timedOut(), externalAborted(), cleanup()}` | 合并外部 signal 与内部超时定时器；外部中止时携带 `signal.reason` |
| `raceWithAbort(promise, ctx)` | → Promise | 与「合并 signal 中止」赛跑，中止即以原生 `DOMException(...,'AbortError')` 拒绝；finally 移除监听（无未处理拒绝） |
| `createHttpError(res)` | → `Promise<ApiError('http')>` | message 优先级：**响应体 JSON 的 `error` 字段 → 响应体原文 → `HTTP ${status}`**；附 `status` |
| `normalizeFetchError(err, ctx, timeoutMs)` | → err | ApiError 原样透传；超时→`ApiError('timeout', 'request timed out after Nms')`；外部取消→原生 AbortError；其余（fetch TypeError/连接拒绝）→`ApiError('network', 'network request failed: ' + detail)` |
| `request(url, init, {signal, timeoutMs})` | → ok 的 `Response` | fetch 封装：非 2xx 抛 `ApiError('http')`；`finally` 必定 `ctx.cleanup()` |

**明确没有的东西**（避免臆造）：❌ 无 baseURL（在 api/shared.js）、❌ 无重试、❌ 无请求去重/防重、❌ 无拦截器、❌ 无统一 loading 态、❌ 无鉴权头。

**React 版必须保留的行为清单**：

1. 默认 30s 超时，可用 `timeoutMs` 覆盖（`0/负数 = 不设超时`，源码 `if (timeoutMs > 0)` 分支）。
2. 外部 `AbortSignal` 与内部超时**合并**为单一 signal；外部取消抛**原生 AbortError**（调用方按「静默处理」约定消费，不弹错）。
3. 错误四分类 `network / timeout / http / protocol`，`ApiError.message` 保持人类可读（现有页面普遍 `catch(e){ e.message }`）；http 类 message 取响应体 `JSON.error` → 文本 → `HTTP N`。
4. `request` 返回已通过 `res.ok` 校验的 Response，body 读取留给上层（apiFetch 里 `.json()`）。
5. 超时错误带 `cause`（原始异常），network 错误带 `cause`；`timeout` 文案含实际超时值。
6. 请求结束无条件 cleanup（定时器 + 外部监听），不产生未处理 rejection。
7. `kind:'protocol'` 枚举位保留（流式聊天解析层使用）。
8. React 版建议原样移植为 `request.ts`（现工作区已出现孪生 `request.ts`，验收时以本清单 diff）。

### 3.2 api/shared.js 与 api/index.js（API_BASE 与桶导出）

```js
export const API_BASE = 'http://127.0.0.1:5174/api'   // 硬编码，无环境开关

export async function apiFetch(path, init) {
  const { signal, timeoutMs, ...rest } = init ?? {}
  const res = await request(`${API_BASE}${path}`,
    { headers: { 'Content-Type': 'application/json', ...(rest.headers || {}) }, ...rest },
    { signal, timeoutMs })
  return res.status === 204 ? null : res.json()
}
```

契约点：默认 JSON 头（可覆盖）；`init.signal`/`init.timeoutMs` 两个保留键透传给 request 层（不会发给 fetch 的 init）；204 → `null`，其余 2xx → `res.json()`；非 2xx 由 request 层抛 ApiError。
桶导出（`api/index.js`）契约：**业务组件只允许从桶 import**，桶保持与旧 `api.js` 完全同名导出：`apiFetch`、`ApiError` + `diary/chat/model/confirm/ledger/todo/schedule/memory-wiki/observe` 九个域 `export *`。

### 3.3 syncSignals.js（信号列表与语义）

| 导出 | 语义 |
| --- | --- |
| 事件常量 `'cornie:data-changed'` | 本地 CustomEvent 名 |
| `emitDataChanged(detail)` | ① `window.dispatchEvent(CustomEvent('cornie:data-changed',{detail}))`；② `window.cornieDesktop.broadcastDataChanged(detail)` 交主进程广播到其它窗口（失败静默忽略） |
| `listenDataChanged(handler)` | 返回解绑函数；handler 收 `event.detail ?? {}`；**首次调用时惰性** `ensureRemoteDataSync()`：订阅 preload `onDataChanged`，把 IPC 广播回注为本地 CustomEvent（`remoteSyncBound` 全局只绑一次） |
| `collectChangedDomains(results)` | 输入 tool 执行结果数组；`item.ok === false` 跳过；按 `tool_name` 前缀映射领域布尔位 |

**领域前缀映射表**（源码逐项）：

| 领域位 | 触发的 tool_name 前缀 |
| --- | --- |
| `ledger` | `ledger.`、`ledger_category.` |
| `todo` | `todo.`、`todo_category.` |
| `schedule` | `schedule.`、`schedule_category.` |
| `observation` | `observation.` |
| `memory` | `memory_wiki.`、`memory_index.`、`memory_governance.` |

- `detail` 实际形状：`{ source: 'chat' | 'confirmation', ledger, todo, schedule, observation, memory }`（布尔位；无 chat/diary 域——聊天与日记模块不依赖该信号）。
- **React 版建议**：信号本质是「单窗口内事件总线 + IPC 广播」。不建议 EventSource/SSE（本地 API 无该端点，跨窗同步走的是 IPC 而非 HTTP）。建议：
  - 保留 preload 的 IPC 通道不动，把「window CustomEvent 总线」收敛为模块级单例注册表（`subscribe(handler): unsubscribe` + `emit(detail)`），避免字符串事件全局裸奔；
  - 用 hook 封装领域过滤：`useDataChanged(['todo'], () => refresh())`，内部 `useEffect` 订阅 + cleanup，语义与现有 onMounted/onBeforeUnmount 模式等价；
  - 若要避免 handler 闭包过期，可 `useSyncExternalStore` 暴露「lastChangedAt/domain 序号」供各页做失效判断；保守方案（直接 useEffect + 回调 ref）也满足现状行为。

### 3.4 preload.cjs 暴露的 API 面（`window.cornieDesktop`）

| window.cornieDesktop 方法 | 参数 | 传输 | 用途 |
| --- | --- | --- | --- |
| `dragStart({screenX, screenY})` | `{screenX:number, screenY:number}` | `send('cornie:drag-start', payload)` | 通知主进程记录拖拽起点 |
| `dragMove({screenX, screenY})` | 同上 | `send('cornie:drag-move', payload)` | 增量移动窗口 |
| `dragEnd()` | — | `send('cornie:drag-end')` | 结束拖拽、清空状态 |
| `showMainWindow()` | — | `send('cornie:show-main')` | 显示/恢复/聚焦主窗（销毁则重建） |
| `getAlwaysOnTop()` | — | `invoke('cornie:get-always-on-top')` | 读桌宠置顶态 → boolean |
| `setAlwaysOnTop(value)` | `value:any`（主进程 `Boolean(value)`） | `invoke('cornie:set-always-on-top', value)` | 设置置顶，返回归一化 boolean |
| `broadcastDataChanged(detail)` | 任意可序列化 detail | `send('cornie:data-changed', detail)` | 向其它窗口广播数据变更 |
| `onDataChanged(handler)` | `(detail)=>void` | `on('cornie:data-changed', listener)` | 订阅其它窗口的广播；返回解绑函数；非函数入参返回空解绑 |

**桌宠 IPC 拖拽协议**（renderer ↔ main，三段式，主进程为位移权威）：

| 阶段 | 事件 | payload | 主进程行为 |
| --- | --- | --- | --- |
| 按下 | `cornie:drag-start` | `{screenX, screenY}`（**屏幕坐标**，来自 pointer 事件 `e.screenX/screenY`） | 校验为 number；记录 `cornieDragState = { startScreenX, startScreenY, startWinX: getPosition()[0], startWinY: getPosition()[1] }` |
| 移动 | `cornie:drag-move` | `{screenX, screenY}` | `dx = screenX - startScreenX; dy = ...`；目标位 = 起点 + 增量取整；`clampCornieWindowPosition` 夹到 `screen.getDisplayMatching({x,y,1,1}).workArea` 内；`setPosition(x, y, false)`（**不播动画**） |
| 松开 | `cornie:drag-end` | 无 | `cornieDragState = null` |

- renderer 侧守卫：`canWindowDrag(target)` = 目标不在 `button, input` 内；仅左键（`button === 0`）；`setPointerCapture` 锁定指针；`pointerup/pointercancel` 都触发 dragEnd；无 `window.cornieDesktop` 时显示为不可拖（`dragReady=false`，cursor 不变）。
- **React 版要求**：channel 名与 payload 形状不变（主进程不改）；保留 pointer capture + 屏幕坐标方案（不要换成 CSS `-webkit-app-region: drag`——现协议已处理按钮/输入框排除与 workArea 夹紧）。

**主进程相关窗口/IPC 事实**（electron/main.js）：

- 主窗：1100×720，`backgroundColor '#0b1020'`，preload 注入；dev 额外 detach DevTools。
- 桌宠窗：360×320，`transparent:true, frame:false, resizable:false, hasShadow:false, focusable:true, skipTaskbar:true, backgroundColor:'#00000000', show:false, alwaysOnTop: cornieAlwaysOnTop`（主进程持有状态，默认 `false`）；`ready-to-show` 后 **win32 且非 dev** 时 `attachToDesktopViaWorkerW(win.getNativeWindowHandle())`（钉到桌面层），再 `showInactive()`（失败回落 `show()`）。
- `cornie:show-main`：主窗销毁→重建；最小化→`restore()`；然后 `show()+focus()`。
- `cornie:data-changed`（收到 IPC）：`broadcastDataChanged(detail, evt.sender)` —— 向所有存活窗口（主窗+桌宠）转发，**跳过发送者自身**。
- always-on-top 是主进程单一状态（`cornieAlwaysOnTop`），`set-always-on-top` 同步 `cornieWindow.setAlwaysOnTop()` 并返回新值。

### 3.5 api/model.js 与 model 设置流（DeepseekConfig 表单字段逐个）

**端点**（api/model.js）：

| 函数 | 方法 & 路径 | 说明 |
| --- | --- | --- |
| `getModelStatus()` | `GET /model/status` | `{ ok, configured, provider:'deepseek', model, reason }` |
| `getModelSettings()` | `GET /settings/model` | 返回 `{ settings: { configured, maskedApiKey, baseUrl, model, timeoutMs } }` |
| `saveModelSettings(payload)` | `PUT /settings/model`，JSON body | payload 为 `{ apiKey, baseUrl, model, timeoutMs }`（**timeoutMs 以字符串原样提交**） |
| `clearModelSettings()` | `DELETE /settings/model` | 清空钥匙 |

**状态源 `useModelSettings()`**（App 引导横幅与 DeepseekConfig 共用）：

- 状态：`modelStatus`、`modelSettings`、`form`、`saving`、`loading`（初始 true）、`errorMsg`、`noticeMsg`。
- `form` 默认：`{ apiKey:'', baseUrl:'', model:'deepseek-chat', timeoutMs:'30000' }`；`refresh()` 并行拉 status+settings 后回填（apiKey 恒为空串，不回显）。
- `check({silent})`：只拉 status；非静默时成功 notice「铃湾已经连上啦！」/失败「还没连上，检查下钥匙和网络。」。
- `submit()`：PUT → notice「铃湾已经把钥匙收好啦…」→ `refresh()` + `check({silent:true})`；失败 `errorMsg = toFriendlyError(e)`。
- `reset()`：DELETE → notice「已经把本地保存的钥匙收起来啦。」→ 同上刷新。
- **友好错误映射**（toFriendlyError，逐条）：

| 原始 message 匹配 | 文案 |
| --- | --- |
| 空 | 铃湾刚刚没把设置收好，我们再试一次就好。 |
| `/apiKey is required/i` | API Key 这一栏还是空的，铃湾还没拿到钥匙呢。 |
| `/invalid timeout/i` | 超时毫秒要填成正整数呀，比如 30000。 |
| `/http_\|request_failed\|fetch\|network\|timeout/i` | 铃湾刚刚去敲门时没收到顺利回应，可能是网络、地址或者钥匙状态出了点小岔子。 |
| 其它 | 这次保存没成功，不过别担心，我们检查一下输入内容再试一次就好。 |

- 拉取失败兜底：`modelStatus = { ok:false, configured:false, provider:'deepseek', model:'', reason:'request_failed' }`，errorMsg「铃湾没能连上，我们可以稍后再试。」。

**DeepseekConfig 表单字段（逐个）**：

| 字段 | 控件（现状） | 默认 / 回填 | placeholder | 提交 |
| --- | --- | --- | --- | --- |
| `apiKey` | `<input type="password" autocomplete="off">` | 永不回填；已保存时单独展示 `modelSettings.maskedApiKey`（「当前已保存：sk-…」） | 把你的钥匙放在这里 | 原样入 PUT payload |
| `baseUrl` | `<input>` 文本 | `settings.baseUrl \|\| ''` | 默认地址即可 | 原样入 payload |
| `model` | `<input>` 文本 | `settings.model \|\| 'deepseek-chat'` | deepseek-chat | 原样入 payload |
| `timeoutMs` | `<input inputmode="numeric">` | `String(settings.timeoutMs)` 或 `'30000'` | 30000 | **字符串**入 payload（服务端校验正整数） |

- 操作：`保存并检测`（submit，saving 时禁用，文案「保存中…」）→ 成功 `emit('updated')`；`只检测`（checkOnly）；`清空钥匙`（仅 `modelSettings.configured` 时显示，dangerGhost 变体）→ 成功 `emit('updated')`。
- loading 态：表单整体替换为「检查中…」。
- 错误/提示条：configError（danger 底色）、configNotice（success 底色）、configCurrent（accent 底色）。
- **App 引导横幅（配网）复用同一 form**：同样 4 字段 + 保存并检测/只检测两键，无「清空钥匙」；横幅与 RouterView **互斥渲染**（v-if/v-else，未配置时完全遮住路由内容，见 §7-7）。
- **SettingsHome 展示逻辑**：statusText 三态 `已连接`（ok）/`未连接（钥匙可能在但连不上）`（configured）/`未配置`；ok 时显示「当前模型：modelStatus.model || modelSettings.model || 'deepseek-chat'」，未 ok 但 configured 时显示「钥匙已保存：maskedApiKey」。

---

## 4. 桌宠窗口 CorniePet 规格

### 4.1 窗口参数（main.js `createCornieWindow`）

360×320；`transparent/frame:false/resizable:false/hasShadow:false/skipTaskbar:true/focusable:true`；`backgroundColor '#00000000'`；`show:false` + `ready-to-show` 后 `showInactive()`；win32 生产环境附加 `attachToDesktopViaWorkerW`（嵌入桌面层，此后 alwaysOnTop 语义受其影响）。dev 加载 `http://127.0.0.1:5173/cornie.html`，生产 `dist/cornie.html`。

### 4.2 状态机（表情 / 动画 / 气泡 / 输入 / 打开主窗）

**状态变量**：`hover`、`pinned`（停留）、`focused`（窗口内焦点）、`alwaysOnTop`（初始 `getAlwaysOnTop()`）、`dragReady`（存在 `window.cornieDesktop`）、`message`（输入草稿）。

**外观态（优先级从高到低）**：

| 条件 | petStateClass | 表情（mood） |
| --- | --- | --- |
| `sending` | `is-thinking` | `( •_• )` |
| `focused` | `is-focus` | `( •ᴗ• )` |
| `hover \|\| pinned` | `is-hover` | `(•‿•)` |
| 默认 | `is-idle` | `( ᴗ ᴗ )` |

- **展开**：`isExpanded = hover || pinned || focused` → 显示 `petPanel`（消息列表 + 通知条 + 输入栏），同时脸部按钮加 `is-active` 阴影；面板入场动画 `petPanelIn`，脸部常驻呼吸动画 `petBreath`（3.8s 上下 2px）。
- **脸部按钮**：点击 = `pinned = !pinned`（展开态下点脸即收起，除非 hover/focused 仍成立）。
- **气泡/通知 `latestNotice`（优先级）**：
  1. `pendingCount > 0`（kind=confirm 且 status=pending 的数量）→ `{type:'confirm', text:'有 N 件事，小铃湾想先和主人确认一下。', actionLabel:'去主窗口'}` → 按钮触发 `showMainWindow()`；
  2. 最近一条 `kind==='ask_back'` 的问题文本（无按钮）；
  3. 最近一条 `kind==='error'` 的 content（无按钮）；
  4. 都没有则不渲染。通知条样式：confirm→粉调、error→红调底色。
- **消息列表**：只显示 `kind==='message'`（过滤 confirm/ask_back/error/tool_result），角色徽标「主人/小铃湾」，用户消息右对齐（`--pet-user-bubble` 底）、铃湾左对齐（半透明白底）；`sending` 时插入「正在想你说的话……」斜体占位；空态文案「小铃湾在这里 / 把今天想说的话，轻轻放过来吧。」。
- **输入栏**：文本框 Enter 发送（`keydown.enter.prevent`）；`说` 按钮禁用条件 `!message.trim() || sending`；`send()` 成功路径：清空输入 → `focused=true; pinned=true`（发消息强制展开并钉住）→ `sendChat(text)` → 滚底。
- **按钮组**：置顶切换（文案 `顶`/`浮`，title 同步变）、停留切换（`停`/`留`）、发送（`说`）。置顶失败时本地取反兜底。
- **滚动**：`scrollToLatest()` 在以下时机触发：mount、发送后、`displayMessages.length` 变化、`onLeave`（未 pinned 且未 focused 时）、每次轮询同步后（`onAfterSync`）。

### 4.3 IPC 拖拽（renderer 侧协议）

- `dragReady` = `Boolean(window.cornieDesktop)`（onMounted 检测）→ 控制 `.is-draggable` 光标（grab/grabbing）。
- 命中过滤：目标在 `button, input` 内不可拖；仅左键。
- 流程：`pointerdown`（setPointerCapture）→ `dragStart({screenX, screenY})`；`pointermove` → `dragMove({screenX, screenY})`；`pointerup/pointercancel` → `dragEnd()`。位移计算与 workArea 夹紧全部在主进程（§3.4）。
- 整个 petRoot 声明 `-webkit-app-region: no-drag`（防与 Electron 原生 drag region 冲突，拖拽完全由 IPC 协议承担）。

### 4.4 数据流与生命周期（useChat 依赖）

- 挂载序列：`dragReady` 检测 → `getAlwaysOnTop()` → `loadConversation(today())`（GET 会话，role+content 去重）→ `restorePendingConfirmations(today())`（拉 pending 确认项，按 pendingConfirmationId 去重）→ 滚底 → `startConversationSync(today(), {onAfterSync: 滚底})`。
- `startConversationSync` 行为（FE-04）：默认 **3000ms** 轮询（下限 1000ms）；**防重入**（上一轮未完成跳过）；`document.hidden` 时轮询空转，`visibilitychange` 恢复可见立即补一次；卸载时 `stopConversationSync()` 清定时器+监听。
- `send(text)` 走 useChat 核心：用户消息先上屏（pendingSync）→ POST → 响应中 `toolExecution.results` 触发 `emitDataChanged`（§3.3）。
- 桌宠只渲染 `kind==='message'`；confirm/ask_back/error 折叠为 `latestNotice`。

### 4.5 透明背景与 `body.transparent` 处理链（逐层）

1. **主进程**：`transparent:true` + `backgroundColor:'#00000000'` + `hasShadow:false`（否则阴影/底色会破坏透明）。
2. **cornie.html**：内联 `html, body { height:100%; margin:0; background:transparent; }`，且 `<body class="transparent">`（静态写死，早于 JS 执行）。
3. **cornieMain.js**：挂载前 `document.body.classList.add('transparent')`（双保险）。
4. **style.css**：`body.transparent { background: transparent !important; }` —— 覆盖 body 默认 `background: var(--bg)`。
5. **组件**：`.petRoot { background: transparent; width/height 100vw/100vh; flex 右下角对齐; padding 12px; overflow hidden; }`；`.petPanel` 使用半透明 `--pet-bg` + `backdrop-filter: blur(10px)`；`.petFace` 部件含 radial-gradient 光晕。
6. ⚠️ 桌宠入口**不装路由、不装 Mantine**（见 4.7）；主窗 body 无 `transparent` 类，正常 `--bg` 底。

### 4.6 cornieBlink 的作用（及 cornieConfig 数据）

`createCornieBlinkController({ showLayer, hideLayers, setHeadDipPx, minIntervalMs=3000, maxIntervalMs=8000, doubleBlinkChance=0.2 })` 返回 `{ start, stop, blinkNow }`：

- 单次眨眼 `blinkOnce`：头部微沉 `dip = 1 + rand(0,0.4)px`，120+rand(0,60)ms 后归零；层序 `half` 50±8ms → `closed` 80±10ms → `half` 50±8ms → `hideLayers()`（`blinking` 互斥防重）。
- 序列 `blinkSequence`：blinkOnce 后 20% 概率 140+rand(0,220)ms 后来第二次（双眨）。
- 调度 `scheduleNext`：rand(3000, 8000)ms 后执行序列并递归排程。
- **消费方**：`CornieComposer.vue`（部件贴图形象编辑/预览组件，主窗内使用）——`showLayer/hideLayers` 切换 `eyeLayer: 'none'|'half'|'closed'`（eye 覆盖层图片挂在 head 部件坐标系内），`setHeadDipPx` 目前传 `() => {}`（未启用点头）。
- **与桌宠窗口的关系**：当前 `cornie.html` 挂载的是 **CorniePet（文字颜文字方案，不使用 cornieBlink/cornieConfig）**；`cornieConfig.js` 的 `cornieParts`（tail1/body/head/ring 四部件 x/y/scale/rot/opacity/z）、`cornieCssVars`（20 个 `--{part}-{x,y,s,r,o,z}` 变量）、`cornieEyeOverlay {x:94,y:143,w:176,h:124,rot:-1.2}`、`cornieStage {420×420}`、`corniePetTransform {scale:0.25, offsetX:-120, offsetY:-180}` 是「拼装编辑器导出并固化（version:1）」的部件贴图布局，仅被 CornieComposer 消费。若 React 版桌宠升级为贴图形象，需一并迁移控制器与这份数据；若维持文字表情方案，cornieBlink/cornieConfig 随 CornieComposer（主窗侧）另行迁移。

### 4.7 React + Mantine 下的取舍（哪些保留纯手写）

**保留纯手写（不引 Mantine）**：

- 桌宠入口建议零 Mantine：透明窗口里 MantineProvider 体系（组件默认背景、Portal、 Popover 定位、preflight 类重置）都会成为透明/无框窗口的风险面，且 CorniePet 全部 UI 都是自定义样式（气泡、光晕、呼吸/入场动画、4px 自绘滚动条），映射到 Mantine 无收益。
- 状态机用 `useReducer`/多 `useState` 即可（hover/pinned/focused/sending 四态派生 mood/class/expanded 的纯函数逻辑可直接照搬）。
- 拖拽：保留 pointer capture + 三段 IPC；React 中 `onPointerDown/Move/Up/Cancel` 直接绑定 shell div，`useRef` 存 `pointerId`。
- 滚底逻辑用 `useLayoutEffect` + ref（替代 `nextTick`）。
- 轮询同步逻辑（3s/防重入/visibilitychange）建议抽成框架无关的 hook（现工作区已出现 `hooks/useTimers.ts`，验收时对照 §4.4 行为）。

**可用 Mantine/库（可选，不必须）**：`@mantine/hooks` 的 `useDisclosure`/`useHover` 可用但收益有限；输入框若强行用 `TextInput` 需 `unstyled` + 手写样式，不建议。消息列表条数少，无需虚拟化。

---

## 5. UI → Mantine 9 组件映射表

> 原则：外壳/设置全量走 Mantine；桌宠窗口保持手写 CSS（§4.7）；UiButton/UiCard 等基座组件被 Mantine 对应件替换后，页面代码里的变体引用需按下表换名。

### 5.1 外壳导航

| 现状（Vue） | Mantine 9 落点 | 备注 |
| --- | --- | --- |
| `.appShell` grid 260px+1fr | `AppShell`（`navbar={{width:260, breakpoint:'sm', collapsed:{mobile:!opened}}}`，`header={{height:56}}`，`padding="md"`） | 保留圆角浮动卡片观感可用 CSS 覆盖或 `layout="alt"` |
| `.navPanel` brand 区 | Navbar 顶部 `Stack`（Title + Text c="dimmed"） | 文案「铃湾 / Cornie」照搬 |
| `.navItem`（icon+label+hint, active） | `NavLink`（`leftSection`=emoji, `label`, `description`=hint, `active`, `onClick`/`component={Link}`） | active 判定保留 `startsWith` 语义；hint 是 Mantine NavLink 原生能力 |
| `.statusDot`（在线/未连接） | `Badge`（variant="light" color="teal"/"gray"，配圆点）或 `ThemeIcon`+dot | 数据源 modelStatus.ok |
| `.topBar`（标题+hint） | `AppShell.Header`（`Title order={4}` + `Text c="dimmed" size="sm"`） | modeMeta 由路由前缀推导，保持壳层统一 |
| 响应式折叠（≤1180/≤760） | `Burger` + `useDisclosure()` + navbar `collapsed={{mobile: !opened}}`，breakpoint 取 `sm`/`md` | 原 2 列网格导航观感可用 CSS 还原 |
| 路由切换 loading（可选） | `NavigationProgress` | 手动 `start()/done()` 挂路由跳转或关键请求 |
| FE-10 焦点管理 | ref + `useEffect([pathname])` 聚焦 main 容器 | 保留 `outline:none` |

### 5.2 设置页

| 现状 | Mantine 9 落点 |
| --- | --- |
| `UiCard`（标题/副题/actions 插槽） | `Card`（或 `Paper` withBorder radius="lg"）+ Card.Section；头部用 `Group justify="space-between"` |
| `UiButton` variant | `Button`：`default`→`variant="filled"`（主色）；`outline`→`variant="default"`；`ghost`→`variant="subtle"` color="gray"；`dangerGhost`→`variant="subtle"` color 系 danger；`destructive`→`variant="filled"` color danger；`secondary`→`variant="light"`；`link`→`variant="subtle"`+underline |
| SettingsHome 状态三态 | `Badge`/`Alert`（ok→success，configured→warning，off→dimmed） |
| DeepseekConfig 4 字段 | `PasswordInput`（apiKey，可见性切换优于原 password 框）/ `TextInput`（baseUrl、model）/ `NumberInput`（timeoutMs，**注意提交层仍是字符串契约**，见 §3.5）+ `@mantine/form` `useForm({ initialValues, validate })` |
| 「当前已保存 maskedApiKey」 | `Alert`（color 主色，variant="light"）或 `Code` |
| errorMsg / noticeMsg | 行内 `Alert`（danger/success）＋可选 `notifications.show` 全局提示 |
| loading「检查中…」 | `Loader` / `Skeleton` |
| AdvancedSettings 高级模式开关 | `Switch`（替代「已启用/已关闭」按钮对） |
| advCard 网格（3 列，active 高亮） | `SimpleGrid cols={3}` + `Card`（active 用 light 变体或 aria-pressed 样式） |
| UiEmpty 空态（🔒 高级模式已关闭） | `Center`+`ThemeIcon`+`Text`+`Button`（Mantine 无内建 Empty 组件） |
| 「即将提供」占位 | `Paper` dashed border + dimmed Text（Mantine 无 Placeholder） |
| 设置子页（deepseek/advanced） | 保留 2 条子路由；若想收敛可用 `Tabs`（value 绑路由参数）——默认建议保留路由形态（深链不变） |
| 引导横幅 | `Alert`（variant="light"）+ 表单字段同上；若改 Modal 需先过 §7-7 的行为决策 |

### 5.3 桌宠

| 现状 | 建议 |
| --- | --- |
| petPanel / petFace / 气泡 / 输入栏 / 动画 | **全部手写 CSS 保留**（§4.7），不映射 |
| 若团队坚持映射 | 仅 `TextInput`（unstyled 变体）勉强可替换 petInput；按钮不换（app-region/透明层级敏感） |

### 5.4 配套库

- `@mantine/form`：DeepseekConfig 与引导横幅共用一个 schema（`apiKey` 必填校验文案对齐 toFriendlyError；`timeoutMs` 正整数）。
- `notifications`：保存成功/检测失败等 noticeMsg 可升级为 toast（注意：现状是行内常驻条，产品语义不同，需决策而非静默替换）。
- `@mantine/hooks`：`useDisclosure`（Drawer/Burger）、`useLocalStorage`（AdvancedSettings 的 `advancedMode` 可持久化；pinned/alwaysOnTop 属窗口态**不得**落 localStorage，以主进程为准）、`useHover`（桌宠可选用）。
- `Modal/Drawer`：现状文件未使用；建议「打开主窗确认」等无需新增；如引入，注意透明窗口内 Portal 表现（§7-4）。

---

## 6. 全局 Token 迁移映射表（tokens.css → Mantine 9）

> tokens.css 现通过 Tailwind 4.3 `@theme static` 发射（含旧名兼容层）。弃用 Tailwind 后，所有 `var(--color-*)`、`var(--radius-*)`、`var(--text-*)`、`var(--spacing-*)` 引用必须由「Mantine 主题对象 + CSSVariablesResolver + 手写 `:root` 块」三者补齐。策略：**进 Mantine 组件的值进 theme；手写组件/桌宠继续用 CSS 变量**。

### 6.1 颜色

| token | 值 | Mantine 9 落点 |
| --- | --- | --- |
| `--color-bg` | `#faf8f5` | `theme.white` 不动；页面底色写进 `AppShell.Main`/全局 CSS（`--mantine-color-body` 由 CSSVariablesResolver 覆写为 bg） |
| `--color-surface` | `#ffffff` | `colors.paper` 或组件默认白；卡片用现值 |
| `--color-surface-2` | `#f5f2ee` | `colors.gray` 自定义数组浅档（hover 面） |
| `--color-text` | `#2d2a26` | `colors.dark` 主档 / `theme.white`→text；`defaultTextColor` |
| `--color-muted` | `#9a948c` | `colors.dimmed` 对应档（Mantine `c="dimmed"`） |
| `--color-border` | `rgba(0,0,0,0.08)` | `colors` 边框档或 `defaultBorderColor` 变量 |
| `--color-accent` / `-hover` | `#e8856a` / `#d96f53` | 自定义 `colors.cornie` 10 档数组：以 #e8856a 为基准生成，**第 6 档 ≈ #e8856a**（light 下 `primaryShade` 默认 6），第 7 档 ≈ #d96f53；`primaryColor: 'cornie'` |
| `--color-danger` | `#d96a5c` | `colors.danger` 自定义数组（index 6 ≈ #d96a5c）——不用 Mantine 内建 red，色相不符 |
| `--color-success` | `#5b9a6b` | `colors.success` 自定义数组同理 |
| `--color-warning` | `#e4a35e` | `colors.warning` 自定义数组 |
| `--color-*-soft`（success/warning/danger/info） | `#eef6f0 / #fff7ea / #fbedea / #f5f8fb` | 供 `variant="light"` 的 `lightColors`/`lightLabels` 用；或组件级 `bg="var(--cornie-success-soft)"` |
| `--color-tint-{chat,diary,ledger,todo,schedule,memory}` | `#fff4f0 / #fff0f3 / #f0f5f0 / #fff7ef / #fff7ef / #eff4f9` | **CSSVariablesResolver 保留项**：发射为 `--cornie-tint-chat` 等 6 个变量（模块底色，非 Mantine 语义色，不进 colors 数组） |
| `--color-chart-{sage,sand}` | `#8db5a7 / #c59e7a` | 保留为 CSS 变量（图表专用） |

### 6.2 字号（10 档刻度）

| token（px/行高） | Mantine 落点 |
| --- | --- |
| xs 11/1.5、sm 12/1.5 | `theme.fontSizes: { xs:'0.6875rem', sm:'0.75rem', md:'0.875rem', lg:'1rem', xl:'1.125rem' }`（14→md、16→lg、18→xl） |
| base 13/1.5、md 14/1.6 | 13px 无原生槽位 → 用 `size="sm"`+CSS 或保留 `--text-base` 变量给手写组件；**正文默认 13px 需在全局 CSS 指定** |
| lg 16、xl 18、2xl 20 | fontSizes lg/xl + `headings.sizes` |
| 3xl 24/1.3、4xl 28/1.3、5xl 32/1.2 | `headings.sizes: { h1:'2rem', h2:'1.75rem', h3:'1.5rem' }` + 行高覆盖 |
| 兼容 | 手写组件继续 `var(--text-*)`：在 `:root` 手写块保留全部 10 档（10 个 `--text-*` + 行高） |

### 6.3 间距 / 圆角 / 阴影 / 动效

| token 组 | 值 | Mantine 落点 |
| --- | --- | --- |
| `--spacing-1..6,8` | 4/8/12/16/20/24/32 px | `theme.spacing: { xs:4, sm:8, md:12, lg:16, xl:20 }`（仅 5 槽）；24/32 用字面量或 `rem`；⚠️ Mantine 语义 spacing.md 默认 16，改 12 会影响全部组件默认密度——**建议不改 theme.spacing，改用 `p="12"`/`gap="12"` 字面量**，或者接受密度整体收紧的一致性决策 |
| `--radius-sm/md/lg/xl/2xl` | 10/12/14/16/20 px | `theme.radius: { xs:'0.625rem', sm:'0.75rem', md:'0.875rem', lg:'1rem', xl:'1.25rem' }`；`defaultRadius: 'sm'`（12px，与现 button/input 10–12px 观感最接近）或 `'md'`（14px，卡片段） |
| `--shadow-card` | `0 2px 10px rgba(45,42,38,0.05)` | `theme.shadows: { xs: card, sm: raised, … }` 组件引用 `shadow="xs"` |
| `--shadow-raised` | `0 8px 24px rgba(45,42,38,0.08)` | 同上 `sm`（或自定义 key `card/raised` 经 CSSVariablesResolver） |
| `--duration-fast/base/slow`、`--ease-standard/out` | 160/220/320ms；`ease`；`cubic-bezier(0.22,1,0.36,1)` | Mantine 无全局动效 token → **CSSVariablesResolver 保留为 `--cornie-duration-*`/`--cornie-ease-*`**，手写动画与 transitionTimingFunction 继续引用 |

### 6.4 旧名兼容层（21 个别名）

`--bg/--surface/--surface-2/--text/--muted/--border/--accent/--accent-hover/--danger/--success/--success-soft/--warning/--warning-soft/--danger-soft/--info-soft/--chat-tint/--diary-tint/--ledger-tint/--todo-tint/--schedule-tint/--memory-tint`

处置：React 全量重写后不再需要旧名——统一改引 `--cornie-*`（CSSVariablesResolver 发射）或 Mantine 语义（`var(--mantine-color-*)`）。**过渡期共存**（Vue 与 React 同仓）时保留旧名 `:root` 块，重写完成删除。

### 6.5 pet-* 专属组（18 个）——纯 CSS 保留项

`--pet-bg`、`--pet-bg-soft`、`--pet-surface`、`--pet-border`、`--pet-shadow-soft`、`--pet-shadow-hover`、`--pet-text`、`--pet-text-soft`、`--pet-text-faint`、`--pet-accent`、`--pet-accent-strong`、`--pet-accent-soft`、`--pet-user-bubble`、`--pet-cornie-bubble`、`--pet-input-bg`、`--pet-transition-fast/base/slow`

处置：**不进 Mantine theme**。单独收进 `pet.css`（或保留在 pet 入口专用样式），`:root` 作用域即可——桌宠窗口不挂 MantineProvider，这些变量只服务 CorniePet/CornieComposer 的手写样式。

### 6.6 style.css 全局元素样式的去向

| 现状 | 处置 |
| --- | --- |
| body 字体栈（Microsoft YaHei → PingFang SC → Segoe UI → …）、14px/1.6 | `theme.fontFamily` + `theme.fontSizes.md`；`forceColorScheme="light"` |
| `body.transparent` | 保留原样（pet 侧手写） |
| 全局 button/input/textarea/.card 元素样式（@layer base） | **随 Mantine 接管而废弃**：Button/Input/Textarea/Card 语义由组件库承担；`textarea min-height:280px` 等特例迁入对应组件 props/手写块。⚠️ 重写过渡期两套并存时，Mantine 样式优先级与 @layer base 的相互作用需实测（Mantine 默认不进 layer） |
| Tailwind `@import theme/utilities`（tokens.css 头部） | 重写完成后移除；过渡期注意 utilities 层压过 base 层的历史行为（T-03 注释） |

---

## 7. 边界与坑

1. **双入口构建 + 入口文件名已被预改 .tsx**：`vite.config.ts` 双 input（`index.html`→main、`cornie.html`→cornie）；`index.html`/`cornie.html` 的 `<script src>` 已指向 `/src/renderer/main.tsx`、`/src/renderer/cornieMain.tsx`（Vue 基线期原为 main.js/cornieMain.js，React 迁移已按新名开工且文件已出现）。重写必须**一次切换双入口**：两个 html 都要指向新入口，缺一会让桌宠窗口白屏（透明窗口白屏=完全不可见，且无报错弹层）。生产构建产物是 `dist/index.html` + `dist/cornie.html` 两棵资源树，Electron 分别 `loadFile`。
2. **hash 路由与 Electron file://**：现网用 `createWebHashHistory`（注释明示「兼容 Electron file:// 与 vite dev」）。React 版**必须** `createHashRouter`/`<HashRouter>`，不能用 BrowserRouter——file:// 下 history 路由直接坏。深链契约要保真：`/chat/day/:date` 从 `query.focus` 取 `focusMessageId`；`/observe/detail/:id` 用 props 透传；未知路径重定向 `/chat`。
3. **file:// 资源路径待验证**：`vite.config.ts` 未设置 `base`（默认 `'/'`），`loadFile(dist/index.html)` 时绝对路径资源在 file:// 协议下会指向盘符根。重写时验证生产包：必要时 `base: './'`（并复核双入口相对引用与 hash 路由组合）。
4. **透明窗口与 Mantine/Portal 行为**：桌宠窗口靠整条透明链（§4.5）成立。Mantine 组件（Paper/Card/Modal）默认带不透明背景与阴影，Portal 默认挂 `document.body`——**桌宠入口不要包 MantineProvider**，否则任一组件落进透明窗口都会出现方块底。主窗中若用 Modal/Drawer/notifications，注意 `backdrop-filter`/`box-shadow` 在透明 BrowserWindow 上无「窗外模糊」，视觉验收要在真实窗口做而非浏览器。
5. **透明窗口上的拖拽/置顶语义**：拖拽走 pointer capture + IPC 三段协议（§3.4），不要换成 `-webkit-app-region`（与透明+无框+嵌入桌面叠加后行为不可控；现组件全量 no-drag）。`alwaysOnTop` 状态以主进程为单一事实（`cornieAlwaysOnTop`），且 win32 生产环境桌宠先被 `attachToDesktopViaWorkerW` 钉到桌面层——置顶与钉桌面的叠加行为需要在打包版上实测。`setPosition(x,y,false)` 不动画、workArea 夹紧逻辑必须保留。
6. **SettingsHome 的 `go` 事件缺口（现存疑似 bug）**：SettingsHome 发出 `go:'deepseek-config'` 与 `go:'advanced'`，但 App.vue `handleGo` 没有这两个分支（只处理 observation/editor/cornie-review/on-this-day 家族）——两个入口按钮经 `navHandlers.go` 接线后**不会发生导航**。React 版改为声明式 `Link`/`useNavigate` 时会自然修掉，但需有意识地验证设置两个子页可达（现路由 `/settings/deepseek`、`/settings/advanced` 本身存在）。
7. **引导横幅互斥渲染**：`!modelStatus.configured` 时引导横幅**完全替换** RouterView（v-if/v-else），用户在配置完成前进不了任何页面；且横幅可见性只由 `onMounted` 与 `updated` 事件刷新，`cornie:data-changed` 不触发它。React 版需决策：保留互斥（现状行为）还是改为横幅+内容并存；若保留，刷新时机契约照搬。
8. **信号领域覆盖不全（设计事实）**：`collectChangedDomains` 只覆盖 ledger/todo/schedule/observation/memory 五域；chat 与 diary 不在信号内（聊天靠自身 3s 轮询，日记页靠自身操作刷新）。React 版不要「顺手补全」而破坏这个约定，除非产品层面确认。
9. **useChat 轮询契约**：桌宠窗口长期可见 → 3s 轮询持续运行；防重入 + `document.hidden` 跳过 + visibilitychange 补一次的细节（§4.4）必须保留，否则慢响应下请求叠加。React 版注意 effect 依赖与 cleanup 的等价性（卸载即停轮询）。
10. **ApiError `protocol` 枚举位**：request.js 注释保留 `protocol` 分类但本模块不产生——它是流式聊天解析层（api/chat 域）的保留位。React 版 request 层不要删这个枚举值。
11. **UiCard 背景疑似暗色遗留**：`UiCard.vue` 背景为 `rgba(255,255,255,0.05)`（5% 白），叠在浅色 `--bg #faf8f5` 上近似透明——与 `--surface #ffffff` 语义冲突。迁移到 Mantine `Card` 时按 `--surface`（不透明白）处理，不要复刻这个 5% 白。
12. **桌宠窗口几何**：窗口 360×320，`.petShell max-width:320px` 锚定右下角 padding 12px，消息区 max-height 136px——窄窗口下展开面板依赖 `min(320px, calc(100vw - 24px))`。React 版保持右下角锚定与窗口尺寸约定（改窗口尺寸要动 main.js）。
13. **tokens.css 依赖 Tailwind 发射**：规范 token 走 `@theme static`（注释明示：Tailwind 4.3 默认摇树未使用变量，而存量组件直接 `var(--radius-*)/var(--spacing-*)` 引用）。弃 Tailwind 后必须在 `:root`/CSSVariablesResolver 补齐全部被引用变量（含行高 pair `--text-xs--line-height` 等），否则手写组件静默失样。
14. **preload 通道契约冻结**：8 个 channel 名与 payload 形状（screenX/screenY 为 number、detail 任意可序列化、always-on-top 返回归一化 boolean、onDataChanged 返回解绑函数）是 renderer↔main 的稳定契约，重写 renderer 时**不改 preload.cjs 与 main.js**；`dragStart/dragMove/dragEnd/showMainWindow/broadcastDataChanged` 是单向 `send`（无返回值），`get/setAlwaysOnTop` 是 `invoke`（有返回）。
15. **端口硬编码**：`API_BASE = http://127.0.0.1:5174/api`、dev 渲染层 `127.0.0.1:5173`（strictPort + predev kill-port）。React 版继续沿用；改端口需同步 electron/main.js、vite.config、predev 脚本三处。
16. **并行迁移漂移风险**：工作区已有 React 孪生文件（§开头警告）。本盘点描述 Vue 基线；验收 React 版时按 §2.4、§3.1–3.5、§4.2–4.4、§7-6/7-9 的契约逐条 diff，特别是 navHandlers 的智能返回分支、配网表单字符串 timeoutMs、轮询防重入细节。