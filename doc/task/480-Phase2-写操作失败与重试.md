# 480 Phase 2 写操作失败与重试

## 1. Where this task sits

- **Phase 2 日常业务都能真实落库**：目标是一个工作日的六类业务能保存并重载。
- 本任务落实 Phase 2 的写入可恢复要求，为所有业务写操作给出失败状态与重试入口。
- 开始前依赖任务 478 与 479 的真实写入接线；跨模块演示依赖可见失败行为。

## 2. What the developer needs to know

**Read first**

- `src/renderer/components/ledger/LedgerHomePage.vue` — 收支保存和删除如何吞掉失败。
- `src/renderer/components/todo/TodoHomePage.vue` — 待办状态操作如何吞掉失败。
- `src/renderer/components/schedule/ScheduleHomePage.vue` — 日程状态操作如何吞掉失败。
- `src/renderer/components/diary/DiaryHomePage.vue` — 日记写入的已知失败表现。
- `src/renderer/components/observe/ObservationForm.vue` — 观察写入的失败边界。

**Settled**

- 写入失败必须显示消息和重试入口。
- 重试复用原始动作参数，不重复创建本地乐观数据。
- 成功后刷新真实服务数据并清除错误。

**Edges and seam**

- 接缝是业务页面的既有 async 写操作。
- 不引入全局通知库或统一状态管理。

**Run**

- `npx vitest run src/renderer/components/{ledger,todo,schedule,diary,observe} --maxWorkers=1`
- `npm run test:full`
- `npm run build`。

**Unknowns**

- 若某页面没有重试所需原参数，先保存最小草稿；不得重放未知删除。
- 删除失败只能让用户重新确认，不能自动重复删除。

## 3. The workflow

1. 阅读第 2 部分，复述：每次失败都让用户看见原因并能安全恢复。
2. 为一类创建操作与一类状态操作写失败测试。
3. 复用页面内错误状态补齐显示和重试。
4. 对删除失败只恢复可操作状态，产出安全边界。
5. 运行三个命令并提交。

## 4. The test cases

| Case | Input | Expected | Seam |
|---|---|---|---|
| 收支保存失败 | 500 | 显示保存失败与重试 | `LedgerHomePage` |
| 待办完成失败 | 500 | 条目保持原状态 | `TodoHomePage` |
| 日程恢复失败 | 500 | 显示重试入口 | `ScheduleHomePage` |
| 日记保存失败 | 500 | 草稿保留 | `DiaryHomePage` |
| 观察保存失败 | 500 | 表单可再次提交 | `ObservationForm` |
