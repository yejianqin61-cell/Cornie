# 170-Phase2.4-日程链路联调

## 1. 任务目标

将日程模块与后端 API 完整打通，覆盖 loading/empty/error 三态。

## 2. 改造组件

| 组件 | 路径 | 改造 |
|------|------|------|
| ScheduleHomePage.vue | `components/schedule/` | loading/error 态 |
| ScheduleForm.vue | `components/schedule/` | saving 态 |

## 3. 验收标准
- [ ] 加载时 skeleton
- [ ] 加载失败 error + 重试
- [ ] 新增/删除后刷新
- [ ] 表单 saving 状态
- [ ] 测试覆盖