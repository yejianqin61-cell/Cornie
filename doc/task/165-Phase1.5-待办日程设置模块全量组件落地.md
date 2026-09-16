# 165-Phase1.5-待办日程设置模块全量组件落地

## 1. 任务目标

在 `src/renderer/components/` 下创建 todo(4) + schedule(4) + settings(5) 共 13 个组件。

## 2. 交付物

```
src/renderer/components/todo/
├── TodoHomePage.vue
├── TodoList.vue
├── TodoForm.vue
├── TodoEmptyState.vue
└── todo.test.js

src/renderer/components/schedule/
├── ScheduleHomePage.vue
├── ScheduleList.vue
├── ScheduleForm.vue
├── ScheduleEmptyState.vue
└── schedule.test.js

src/renderer/components/settings/
├── SettingsPage.vue
├── ModelSettings.vue
├── GeneralSettings.vue
├── AboutSection.vue
├── SettingsSection.vue
└── settings.test.js
```

## 3. 后端对接

### Todo
| 方法 | API |
|------|-----|
| listTodos({ view }) | GET /api/todos?view=open|completed|today |
| createTodo({ title }) | POST /api/todos |
| completeTodo(id) | POST /api/todos/:id/complete |
| reopenTodo(id) | POST /api/todos/:id/reopen |
| deleteTodo(id) | DELETE /api/todos/:id |

### Schedule
| 方法 | API |
|------|-----|
| listSchedules({ view }) | GET /api/schedules?view=upcoming|today |
| createSchedule({ title, startAt }) | POST /api/schedules |
| cancelSchedule(id) | POST /api/schedules/:id/cancel |
| restoreSchedule(id) | POST /api/schedules/:id/restore |
| deleteSchedule(id) | DELETE /api/schedules/:id |

### Settings
| 方法 | API |
|------|-----|
| getModelSettings() | GET /api/settings/model |
| saveModelSettings(body) | PUT /api/settings/model |
| clearModelSettings() | DELETE /api/settings/model |

## 4. 验收

- [ ] 13 组件全部创建
- [ ] Todo: 列表 + 新建 + complete/reopen + delete
- [ ] Schedule: 列表 + 新建 + cancel/restore + delete
- [ ] Settings: model 配置 + 关于信息
- [ ] 测试通过