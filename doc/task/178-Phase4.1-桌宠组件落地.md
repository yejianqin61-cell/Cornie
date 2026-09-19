# 178-Phase4.1-桌宠组件落地

## 目标

创建 Cornie 桌面宠物组件：透明窗口 Canvas 动画、气泡提示、设置面板，并接入多页面构建。

## 当前状态

- `electron/main.js` 已有 `createCornieWindow()`，加载 `corne.html`，透明 frameless 360x320 窗口
- `electron/preload.cjs` 暴露 `corneDesktop` IPC（drag/move/showMainWindow）
- `electron/win32/desktopLayer.js` 将窗口嵌入桌面
- `public/pic/` 有 body、head、ears、tail、eyes 各部分图片
- `corne.html` 仍指向旧 React 入口，需改为 Vue 入口

## 改造范围

### 1. 多页面构建配置

| 文件 | 改动 |
|------|------|
| `corne.html` | script src 改为 `/src/renderer/corne.js` |
| `vite.config.js` | `build.rollupOptions.input` 加入 `corne: 'corne.html'` |

### 2. Pet 入口文件

| 文件 | 职责 |
|------|------|
| `src/renderer/corne.js` | Vue app 挂载，不含全局样式 |
| `src/renderer/components/pet/CorneApp.vue` | 透明容器，管理 pet/bubble/settings 三态 |

### 3. 桌宠组件

| 组件 | 职责 |
|------|------|
| CorniePet | Canvas 动画：呼吸缩放 + 眨眼效果 + 各部分图片组合 |
| CornieBubble | 气泡提示：喝水提醒 / 往年今日 / 日记生成完成 |
| PetSettings | 大小切换 / 置顶开关 / 位置 |

### 4. IPC 集成

- 拖拽：`mousedown → cornieDesktop.dragStart(screenXY)` / `mousemove → cornieDesktop.dragMove(screenXY)` / `mouseup → cornieDesktop.dragEnd()`
- 点击打开主窗口：`dblclick → cornieDesktop.showMainWindow()`
- 置顶：`corneDesktop.getAlwaysOnTop()` / `setAlwaysOnTop(value)`

## 验收标准

- [ ] corne.html 加载 Vue 入口
- [ ] CorniePet Canvas 动画正常（呼吸缩放 + 眨眼）
- [ ] CornieBubble 气泡提示可展示
- [ ] PetSettings 大小/置顶切换
- [ ] 拖拽移动宠物窗口
- [ ] 点击宠物打开主窗口
- [ ] `vite build` 多页面输出 corne.html
- [ ] 测试通过