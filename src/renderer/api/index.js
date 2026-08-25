// F-06：API 客户端按域拆分的桶导出（保持与旧 src/renderer/api.js 完全同名的导出契约，
// 业务组件统一从本桶取函数，不直接 import 域文件）。
export { apiFetch } from './shared.js'
export { ApiError } from '../request.js'

export * from './diary.js'
export * from './chat.js'
export * from './model.js'
export * from './confirm.js'
export * from './ledger.js'
export * from './todo.js'
export * from './schedule.js'
export * from './memory-wiki.js'
export * from './observe.js'
