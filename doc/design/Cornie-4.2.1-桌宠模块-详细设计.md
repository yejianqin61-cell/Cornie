# Cornie 4.2.1 桌宠模块详细设计

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | Cornie 4.2.1 桌宠模块详细设计 |
| 文件名称 | Cornie-4.2.1-桌宠模块-详细设计.md |
| 产品名称 | Cornie（铃湾） |
| 文档编号 | Cornie-4.2.1 |
| 文档类型 | 详细设计 |
| 文档版本 | V1.0 |
| 文档状态 | 编写中 |
| 编写日期 | 2026-05-17 |
| 适用对象 | 研发 |
| 上游文档 | ../Cornie-001-需求分析文档.md, Cornie-4.2-技术架构-详细设计.md |
| 下游文档 | - |
| 关联规范 | ../../criterion/Cornie-backend-api规范.md |
| 存放目录 | doc/design/ |

### 1.1 修订记录

| 版本 | 日期 | 修订人 | 修订说明 |
| ---- | ---- | ------ | -------- |
| V1.0 | 2026-05-17 | Claude | 初始版本，覆盖MVP桌宠模块 |

## 2. 模块概述

桌宠模块负责Cornie形象的桌面展示与基础交互，是产品的"门面"。MVP阶段采用CSS多部件拼装方案（非Live2D），实现呼吸感、眨眼、点击反馈和窗口穿透。

### 2.1 MVP功能范围

| 功能点 | 描述 | 优先级 | 实现状态 |
| --- | --- | --- | --- |
| 桌面显示 | Cornie常驻桌面右下角，透明背景，始终可见 | P0 | 已完成 |
| 呼吸动画 | 待机状态有微弱的呼吸起伏感，伴随眨眼 | P0 | 眨眼已完成，呼吸待实现 |
| 点击反馈 | 点击Cornie时铃铛晃动+尾巴摆动+打开对话框 | P0 | 对话框已完成，部位反馈待实现 |
| 窗口穿透 | 点击Cornie身体区域可交互，背景穿透 | P0 | 已完成（hitbox区域控制） |
| 窗口拖动 | 用户可拖动Cornie到屏幕任意位置 | P0 | 已完成（IPC拖动） |

## 3. 技术方案

### 3.1 窗口架构

```
BrowserWindow (cornie窗口)
├── transparent: true          # 透明背景
├── frame: false               # 无边框
├── alwaysOnTop: false         # 非强制置顶（MVP）
├── skipTaskbar: true          # 不显示在任务栏
├── focusable: true            # 可交互
├── backgroundColor: #00000000 # 透明底色
└── 内容: CorniePet.vue
```

### 3.2 部件拼装方案

#### 3.2.1 部件清单

| 部件ID | 名称 | 图片文件 | 说明 |
| --- | --- | --- | --- |
| head | 头 | head1-removebg-preview.png | 山羊头部，含角 |
| body | 身体 | body-removebg-preview.png | 山羊身体 |
| ring | 铃铛 | ring-removebg-preview.png | 脖子上的铃铛 |
| tail1 | 尾巴 | tail1-removebg-preview.png | 水波尾巴 |

#### 3.2.2 CSS变量固化方案

每个部件的位置、缩放、旋转、透明度通过CSS变量控制，变量值由`cornieConfig.js`统一管理：

```js
// cornieConfig.js
export const cornieCssVars = {
  '--head-x': '245px', '--head-y': '-35px', '--head-s': '1.000', ...
  '--body-x': '293px', '--body-y': '197px', '--body-s': '1.000', ...
  '--ring-x': '396px', '--ring-y': '228px', '--ring-s': '0.740', ...
  '--tail1-x': '337px', '--tail1-y': '314px', '--tail1-s': '0.540', ...
}
```

部件按z-index排序渲染（body z:1 → tail z:0 → head z:4 → ring z:5）。

#### 3.2.3 整体变换

桌宠窗口尺寸为280×520，内部stage为420×420。通过`corniePetTransform`缩放和平移使Cornie主体适配小窗口：

```js
export const corniePetTransform = {
  scale: 0.25,       // 缩小到25%
  offsetX: -120,
  offsetY: -180
}
```

### 3.3 眨眼动画

#### 3.3.1 动画原理

不使用GIF/Live2D，而是在head部件上叠加两个PNG图片层（半闭眼、闭眼），通过定时切换可见性模拟眨眼：

```
睁眼 → (50ms) → 半闭眼(half) → (80ms) → 闭眼(closed) → (50ms) → 半闭眼(half) → 睁眼(none)
```

#### 3.3.2 控制器设计 (`cornieBlink.js`)

```
createCornieBlinkController({
  showLayer,         // 回调：显示眼睛层(half/closed/none)
  hideLayers,        // 回调：隐藏所有眼睛层
  setHeadDipPx,      // 回调：头部微下移(模拟眨眼联动)
  minIntervalMs,     // 最小随机间隔(默认3000ms)
  maxIntervalMs,     // 最大随机间隔(默认8000ms)
  doubleBlinkChance  // 双眨概率(默认0.2)
})
```

**关键行为**：
- 随机间隔（3-8秒）自动眨眼
- 20%概率触发"双眨"（快速连眨两次）
- 眨眼时头部轻微下移1-1.4px，增加真实感
- 支持手动触发眨一眼（blinkNow）
- `CorneieComposer.vue`中可预览眨眼效果

#### 3.3.3 眼睛覆盖层配置

```js
export const cornieEyeOverlay = {
  x: 94, y: 143,    // 相对head左上角的位置
  w: 176, h: 124,   // 覆盖层宽高
  rot: -1.2,         // 微旋转对齐眼睛角度
  opacity: 1
}
```

覆盖层通过`CornieComposer.vue`（编辑模式 ?edit=1）进行可视化调试对齐。

### 3.4 窗口拖动

由于Windows WorkerW桌面层挂载后`-webkit-app-region: drag`可能失效，改用IPC方案：

```
渲染进程: pointerdown → cornieDesktop.dragStart({screenX, screenY})
          pointermove → cornieDesktop.dragMove({screenX, screenY})
          pointerup   → cornieDesktop.dragEnd()

主进程:   接收IPC → 计算偏移量 → cornieWindow.setPosition(x, y)
```

拖动仅在非编辑模式下生效（`canWindowDrag()`检查），编辑模式下hitbox cursor为default。

### 3.5 窗口穿透

- 桌宠窗口整体透明（`background: transparent`）
- 通过hitbox div限定可交互区域（max-width: 268px，水平居中）
- hitbox外部区域透明且不响应事件，鼠标事件穿透到下层桌面
- 调试模式（?hitbox=1）显示浅粉背景+虚线边框，辅助开发者查看hitbox范围

### 3.6 桌面层挂载（仅Windows打包后）

通过`electron/win32/desktopLayer.js`将Cornie窗口挂载到Windows桌面WorkerW层下，使其显示在桌面图标层级：

```
流程: PowerShell → C# Add-Type → FindWorkerW() → SetParent(hwnd, workerw)
```

仅在打包后（`!isDev`）且系统为win32时启用。开发期不挂载以避免WorkerW下交互问题。

## 4. 组件结构

### 4.1 CorniePet.vue（桌宠窗口根组件）

```
CorniePet.vue
├── .petRoot              # 根容器（透明，100vw×100vh）
│   └── .hitbox           # 可交互区域（内聚所有交互）
│       ├── .hitboxPetArea
│       │   └── .stageWrap > .stage   # CSS拼装画布
│       │       ├── .part.p-tail1      # 尾巴
│       │       ├── .part.p-body       # 身体
│       │       ├── .part.p-head       # 头（含眨眼覆盖层）
│       │       └── .part.p-ring       # 铃铛
│       └── .chatBar                  # 对话框（常驻）
│           ├── input.chatInputFlat    # 文字输入
│           ├── button.pinBtnSm        # 固定/解除
│           └── button.sendBtnSm       # 发送
```

### 4.2 状态管理

| 状态 | 类型 | 说明 |
| --- | --- | --- |
| eyeLayer | ref('none'\|'half'\|'closed') | 当前眨眼层 |
| headDipPx | ref(number) | 头部眨眼联动偏移量 |
| editing | ref(boolean) | 编辑模式（?edit=1） |
| hover | ref(boolean) | 鼠标悬浮 |
| pinned | ref(boolean) | 固定状态 |
| message | ref(string) | 输入框文本 |
| dragReady | ref(boolean) | 拖动功能是否就绪 |
| showHitbox | ref(boolean) | 调试模式（H切换） |

### 4.3 快捷键（桌宠窗口）

| 按键 | 功能 |
| --- | --- |
| E | 切换编辑模式（调整眨眼覆盖层） |
| B | 手动触发一次眨眼 |
| C | 复制眨眼覆盖层配置到剪贴板 |
| H | 切换hitbox调试显示 |

## 5. MVP已实现 vs 待实现

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| 多部件CSS拼装 | 已完成 | head/body/ring/tail1四部件 |
| 随机眨眼动画 | 已完成 | 3-8秒间隔，20%双眨概率 |
| 眨眼覆盖层编辑工具 | 已完成 | CornieComposer.vue + ?edit=1 |
| 窗口拖动（IPC方案） | 已完成 | 编辑模式下禁用拖动 |
| 桌面层挂载（WorkerW） | 已完成 | 仅Windows打包后启用 |
| 对话框输入栏 | 已完成 | UI已就绪，发送逻辑待对接 |
| 呼吸起伏动画 | 待实现 | 身体微缩放循环动画 |
| 铃铛晃动/尾巴摆动 | 待实现 | 点击Cornie身体时的反馈动画 |
| 点击不同部位不同反馈 | 待实现 | 点击角/铃铛/尾巴触发表情 |

## 6. 接口定义

### 6.1 桌宠窗口无直接后端API依赖

桌宠窗口通过以下方式与其他模块交互：

| 交互方式 | 说明 |
| --- | --- |
| HTTP → :5174/api/conversations | 发送/获取对话消息（待实现） |
| IPC → cornie:drag-* | 窗口拖动 |
| 共享SQLite | 对话数据、日记数据（通过API间接访问） |

### 6.2 Preload暴露的API

```js
// electron/preload.cjs
contextBridge.exposeInMainWorld('cornieDesktop', {
  dragStart: ({ screenX, screenY }) => ipcRenderer.send('cornie:drag-start', {...}),
  dragMove: ({ screenX, screenY }) => ipcRenderer.send('cornie:drag-move', {...}),
  dragEnd:   ()                   => ipcRenderer.send('cornie:drag-end')
})
```

---

**文档结束**
