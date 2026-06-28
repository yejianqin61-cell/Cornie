# Cornie 4.2 技术架构详细设计

## 1. 文档说明

| 字段 | 内容 |
| --- | --- |
| 文档名称 | Cornie 4.2 技术架构详细设计 |
| 文件名称 | Cornie-4.2-技术架构-详细设计.md |
| 当前状态 | 历史架构文档，已收口 |
| 最近修订 | 2026-06-28 |
| 当前有效补充 | Cornie-0625-模型侧改进设计.md、Cornie-0627-长期记忆LLM-Wiki正式设计.md、Cornie-0628-桌宠窗口重设计方案.md |

## 2. 保留结论

本文件保留的有效架构结论如下：

1. Cornie 仍然采用 Electron 桌面应用架构。
2. 仍然保留主窗口与独立桌宠窗口的双窗口形态。
3. 前端通过本地 API 与后端服务交互。
4. 数据仍以本地存储与后端服务编排为核心。

## 3. 桌宠架构的最新结论

桌宠相关设计以新版文档为准：

1. [Cornie-0628-桌宠窗口重设计方案.md](/C:/Users/USER/Desktop/Cornie/Cornie/doc/design/Cornie-0628-桌宠窗口重设计方案.md)

当前桌宠架构原则已经明确为：

1. 保留独立透明桌宠窗口。
2. 不再采用旧角色拼装展示。
3. 改为颜文字驱动的轻陪伴交互层。
4. 与主窗口共享同一份当日聊天会话。

## 4. 旧实现的归档边界

以下内容仅作为历史实现遗留说明，不再作为目标设计：

1. 旧桌宠调试工具
2. 旧桌宠配置文件
3. 旧桌宠专用动画控制器
4. 与旧展示形态强耦合的资源组织方式

## 5. 当前建议的技术拆分

当前更推荐的模块拆分为：

1. 主窗口渲染层
2. 桌宠渲染层
3. 本地 API / Gateway 层
4. Agent 编排层
5. 工具层
6. 记忆层
7. 本地存储层

## 6. 下游文档指向

后续开发应优先参考：

1. [Cornie-0625-模型侧改进设计.md](/C:/Users/USER/Desktop/Cornie/Cornie/doc/design/Cornie-0625-模型侧改进设计.md)
2. [Cornie-0627-长期记忆LLM-Wiki正式设计.md](/C:/Users/USER/Desktop/Cornie/Cornie/doc/design/Cornie-0627-长期记忆LLM-Wiki正式设计.md)
3. [Cornie-0628-记忆系统设计哲学与全链路说明.md](/C:/Users/USER/Desktop/Cornie/Cornie/doc/design/Cornie-0628-记忆系统设计哲学与全链路说明.md)
4. [Cornie-0628-桌宠窗口重设计方案.md](/C:/Users/USER/Desktop/Cornie/Cornie/doc/design/Cornie-0628-桌宠窗口重设计方案.md)

---

本文件不再承载当前桌宠形态设计细节，相关开发请直接参考新版设计文档。
