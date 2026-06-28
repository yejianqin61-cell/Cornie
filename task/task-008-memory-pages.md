# task-008 记忆页列表与详情页

## 目标

构建记忆页列表和详情/编辑页。对普通人来说，记忆页应像"回忆和偏好笔记页"，而不是"知识治理系统"。

## 背景

当前 `MemoryWikiWorkspace.vue` 提供了 Memory Wiki 的完整操作界面（页面列表、版本、Topic Index、治理队列等）。本次重构需要：
1. 将暴露给普通用户的部分简化为"记忆列表 + 详情编辑"
2. 将治理功能移至高级设置（task-012）

## 关联设计文档

- `Cornie-0628-前端能力边界与人类可见接口设计.md` §9.7
- `Cornie-0628-前端页面清单与树状入口图.md` §5.6, §8.6

## 影响文件

| 文件 | 操作 |
|---|---|
| `src/renderer/components/MemoryPageList.vue` | **新建** |
| `src/renderer/components/MemoryPageDetail.vue` | **新建** |
| `src/renderer/components/MemoryWikiWorkspace.vue` | 保留但移至高级模式 (task-012) |

## 变更规格

### MemoryPageList.vue — 记忆页列表

**内容**：
- 回到观察与记忆首页的导航
- 记忆页列表（卡片式）
- 每条：标题、简短摘要、更新时间
- 搜索/筛选（可选，保持简单）
- 空状态："铃湾正在慢慢记住关于你的事"
- 点击进入详情

**不应出现**：
- 关键来源标注
- Topic 连接
- 关联页面网络
- 主动治理入口
- 历史版本入口
- 巡检候选
- 审核队列
- 页面状态标签（draft/published/archived）

**API**：复用现有 `listMemoryWikiPages`，只传 `pageType`、`status` 基本参数

### MemoryPageDetail.vue — 记忆页详情/编辑页

**内容**：
- 标题（可编辑）
- 正文内容（textarea，可编辑）
- 简短摘要
- 保存按钮
- 返回列表导航
- 温和说明："这是铃湾记住的关于你的事"

**不应出现**：
- 版本历史
- 版本差异对比
- 关联页面管理
- Topic 链接管理
- 状态/重要性设置
- 归档/回滚/合并操作
- 巡检/审计按钮
- 来源追溯面板

**API**：复用现有 `getMemoryWikiPage`、`updateMemoryWikiPage`

## 验收条件

1. 记忆页列表显示所有记忆，卡片式布局
2. 可点击进入详情查看/编辑
3. 可编辑标题和内容并保存
4. 无版本、Topic、治理、关联页面等复杂入口
5. 无巡检/审计/回滚/合并功能暴露
6. 视觉温和，符合新设计语言

## 依赖

- task-001（全局样式）
- task-006（观察与记忆首页 → "查看更多记忆" 跳转到本列表页）
