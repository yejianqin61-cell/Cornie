# 175-Phase3.1-设置模型配置深度联调

## 目标

完善 ModelSettings 组件的全状态覆盖（loading / error / saving / success），并补齐缺失的后端 API 调用。

## 当前状态

- ModelSettings.vue 已调用 `getModelSettings` / `saveModelSettings` / `clearModelSettings` API
- 但缺少 loading 态的骨架/禁用、error 态的提示与重试、saving 态的按钮反馈
- 后端仅有 `/api/settings/model` 三个端点，无通用设置/数据导出端点

## 改造范围

### 1. ModelSettings.vue

| 状态 | 表现 |
|------|------|
| loading | API Key/Base URL/Model 三个 Input disabled + Loader2 spinner |
| error | 红色 banner 文字 "加载失败" + 重试按钮 |
| saving | "保存" 按钮变为 Loader2 + "保存中..." |
| saveError | 红色提示文字在按钮上方 |
| saved | 绿色提示 "已保存" 2 秒后消失 |
| cleared | 同 saved |

### 2. API 补充

在 `src/renderer/api/settings.js` 中确认现有 API 足够（model CRUD 已完备），无需新增。

### 3. 测试

在 `settings.test.js` 中新增：
- loading 状态下 Input 为 disabled
- error 状态下显示错误文字和重试按钮
- saving 状态下按钮文字变为 "保存中..."

## 验收标准

- [ ] ModelSettings 加载时三个 Input 为 disabled
- [ ] 加载失败时显示 error banner + 重试按钮
- [ ] 保存中按钮显示 Loader2 spinner + "保存中..."
- [ ] 保存失败显示 saveError 文字
- [ ] 保存成功显示 "已保存" 提示
- [ ] 测试通过
- [ ] `vite build` 通过