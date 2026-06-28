# task-012 设置首页、DeepSeek 配置页与高级设置页

## 目标

重构设置模块。设置页是收纳页，不是首页。将治理能力后置到高级设置中。

## 背景

当前 `App.vue` 中的 `guideOverlay` 承载了 DeepSeek 配置引导。设置相关逻辑散落在 `App.vue` 的 `<script setup>` 中。需：
1. 独立设置首页
2. 独立 DeepSeek 配置页
3. 将当前 `MemoryWikiWorkspace` 的治理能力放入高级设置

## 关联设计文档

- `Cornie-0628-前端能力边界与人类可见接口设计.md` §11
- `Cornie-0628-前端首页原型结构草案.md` §10
- `Cornie-0628-前端页面清单与树状入口图.md` §5.7, §6, §8.7

## 影响文件

| 文件 | 操作 |
|---|---|
| `src/renderer/components/SettingsHome.vue` | **新建** |
| `src/renderer/components/DeepseekConfig.vue` | **新建** |
| `src/renderer/components/AdvancedSettings.vue` | **新建** |
| `src/renderer/App.vue` | 移除 `guideOverlay` 和设置相关逻辑 |
| `src/renderer/components/MemoryWikiWorkspace.vue` | 作为高级模式内容保留/重构 |

## 变更规格

### SettingsHome.vue — 设置首页

**首屏结构**（4 个区块）：

1. **铃湾连接状态**
   - 简单状态："已连接" / "未连接"
   - 是否已配置 DeepSeek
   - **禁止**：大量技术字段、开发调试信息

2. **DeepSeek 配置入口**
   - 卡片入口 → DeepseekConfig
   - 简短说明

3. **数据与隐私说明**
   - 极简说明（3-5 句）
   - 不做长篇协议展示

4. **高级设置入口**
   - 低调入口
   - 不在首屏铺开

### DeepseekConfig.vue — DeepSeek 配置页

**内容**：
- API Key 输入
- Base URL 输入（可选）
- 模型名
- 超时设置
- 保存并检测 / 只检测 / 清空钥匙 按钮
- 状态反馈（成功/失败提示用温和文案）
- 返回设置首页导航

**逻辑**：从 `App.vue` 迁移 `refreshModelState`、`checkModel`、`submitModelSettings`、`resetModelSettings` 和相关状态

**文案约束**：
- 成功："铃湾已经把钥匙收好啦"
- 失败："这次没连上，我们再试试"
- 不使用技术报错原文

### AdvancedSettings.vue — 高级设置页

**内容**：
- 明确标注"高级模式"
- 可选启用/禁用
- 启用后显示以下入口（低调呈现，不铺开）：

```
高级模式（仅启用后可见）
├─ Memory Wiki 工作台（原 MemoryWikiWorkspace）
├─ 版本历史
├─ 页面回滚
├─ 治理审核池
├─ 巡检结果
└─ 审计查看
```

- **不进入**普通用户主路径
- 默认关闭

**API**：复用现有 `getModelStatus`、`getModelSettings`、`saveModelSettings`、`clearModelSettings`

## 验收条件

1. 设置首页显示连接状态 + 配置入口 + 隐私说明 + 高级入口
2. DeepSeek 配置页可配置 API Key、Base URL、模型名
3. 保存后自动检测连接
4. 高级设置默认低调，治理能力不暴露给普通用户
5. 文案温和，不用技术术语
6. `App.vue` 中移除设置相关逻辑，不再有 `guideOverlay`（改为首次启动友好引导）

## 依赖

- task-001（全局样式）
- task-002（导航壳层，mode='settings' 映射到 SettingsHome）
