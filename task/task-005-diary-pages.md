# task-005 日记首页、编辑页、Cornie 日记回看与往年今日

## 目标

重构日记模块全部页面：日记首页、单日编辑、Cornie 日记回看、往年今日回看。情感表达和回看主入口，保留文学感和陪伴感。

## 背景

当前 `App.vue` 中日记模块以内联方式实现（侧边栏 + 编辑器 + 往年今日），混合在一起。需拆分为独立组件，按新视觉语言重做。

## 关联设计文档

- `Cornie-0628-前端能力边界与人类可见接口设计.md` §9.6
- `Cornie-0628-前端首页原型结构草案.md` §5
- `Cornie-0628-前端页面清单与树状入口图.md` §5.2, §8.2
- `Cornie-0628-前端视觉语言设计备忘.md` §5.4

## 影响文件

| 文件 | 操作 |
|---|---|
| `src/renderer/components/DiaryHome.vue` | **新建** |
| `src/renderer/components/DiaryEditor.vue` | **新建** |
| `src/renderer/components/CornieDiaryReview.vue` | **新建** |
| `src/renderer/components/OnThisDayPage.vue` | **新建** |
| `src/renderer/App.vue` | 移除 diary 内联布局代码 |

## 变更规格

### DiaryHome.vue — 日记首页

**首屏结构**（4 个区块）：

1. **今天卡片**
   - 今天日期
   - 当前心情引导句（如"今天发生了什么？"）
   - 是否已写的状态标记（如"今天还没写" / "已经记下了一点"）

2. **我的日记预览区**
   - 展示当日已写内容摘要
   - "继续写" / "开始写" 按钮 → 进入 DiaryEditor

3. **Cornie 日记预览区**
   - 展示铃湾今天写的日记摘要
   - "让铃湾写一篇" 按钮
   - "查看全部" → CornieDiaryReview

4. **往年今日入口**
   - 轻卡片，可点击展开 → OnThisDayPage
   - 不直接铺开全部往年内容

**禁止**：来源说明面板、生成依据解释、多来源综合关系

### DiaryEditor.vue — 单日日记编辑页

**内容**：
- 日期标题
- 我的日记编辑区（textarea，大块可写区域）
- Cornie 日记展示区（只读，铃湾生成的文字）
- 保存按钮（`var(--accent)`）
- 重新生成按钮（次级）
- 返回日记首页导航

**不应出现**：来源透明摘要、生成依据

### CornieDiaryReview.vue — Cornie 日记回看页

**内容**：
- 按月或按列表回看 Cornie 写的日记
- 点击进入具体某一天的 Cornie 日记
- 返回导航
- 温和空状态："Cornie 还没开始写呢"

### OnThisDayPage.vue — 往年今日回看页

**内容**：
- 当前日期对应的往年今日列表
- 每条：日期、我的日记、Cornie 日记（双栏或折叠）
- 加载状态
- 空状态：温和安抚文案（如"那时候我还没出生呢"）

**API**：复用现有 `listEntries`、`getEntry`、`upsertEntry`、`regenerateCornie`、`listOnThisDay`

## 验收条件

1. 日记首页能看到今天卡片 + 我的日记预览 + Cornie 日记预览 + 往年今日入口
2. 可进入编辑器写日记、保存
3. 可触发 Cornie 生成日记
4. 可回看 Cornie 日记列表
5. 可查看往年今日
6. 所有页面无技术面板污染
7. 视觉使用 `var(--diary-tint)` 浅粉色底调

## 依赖

- task-001（全局样式）
- task-002（导航壳层，mode='diary' 映射到 DiaryHome）
