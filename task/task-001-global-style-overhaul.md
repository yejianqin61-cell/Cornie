# task-001 全局视觉语言重构

## 目标

将全局样式从"深色玻璃后台风"改为"浅色暖调陪伴型应用"，建立新的设计语言基础。

## 背景

当前 style.css 存在：深色底 `#0b1020`、蓝紫强调色、backdrop-filter 玻璃效果、后台感按钮风格。与设计文档"温和、轻柔、清爽、有呼吸感"方向相反。

## 影响文件

| 文件 | 操作 |
|---|---|
| `src/renderer/style.css` | 全量重写 |

## 变更规格

### CSS 变量

```
--bg: #FAF8F5            奶白暖底
--surface: #FFFFFF        卡片/面板背景
--surface-2: #F5F2EE      次级面板
--border: rgba(0,0,0,.08) 浅边框
--text: #2D2A26           主文字
--muted: #9A948C          辅助文字
--accent: #E8856A         柔和珊瑚（主强调色）
--accent-hover: #D96F53
--danger: #D96A5C         低饱和暖红
```

### 模块专属浅色调（只做极轻底色，不做大面积）

```
--chat-tint: #FFF4F0      聊天区浅珊瑚
--diary-tint: #FFF0F3     日记区浅粉
--ledger-tint: #F0F5F0    收支区浅绿
--todo-tint: #FFF7EF      待办区浅橙
--memory-tint: #EFF4F9    观察记忆区浅蓝
```

### body

- 背景：`var(--bg)` 纯色，去掉 radial-gradient 光晕
- 移除 `transparent` body 特化（由 CorniePet 自行处理）
- 字体栈保持，字号：正文 14px，行距 1.6

### button

- 主按钮：bg `var(--accent)`，color white，无边框，圆角 10px
- 次级按钮：bg white，border `var(--border)`，color `var(--text)` 
- 危险按钮：bg white，border `var(--danger)` 浅，color `var(--danger)`
- 移除 `rgba(255,255,255,.08)` 深色系半透明背景

### input / textarea

- 背景 white，边框 `var(--border)`，color `var(--text)`
- focus：border-color `var(--accent)`，无 glow

### .card

- 背景 `var(--surface)`，border `1px solid var(--border)`，圆角 16px
- 移除 `backdrop-filter: blur(10px)`

## 验收条件

1. 页面背景是浅暖色，不是深色
2. 主按钮是柔和珊瑚色
3. 没有玻璃模糊效果
4. CorniePet 桌宠窗口视觉不受影响（保持 transparent）
