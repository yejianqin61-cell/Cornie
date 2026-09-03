// F-06：API 客户端按域拆分的桶导出（与 Vue 版 api/index.js 完全同名的导出契约，
// 业务组件统一从本桶取函数，不直接 import 域文件）。
export { apiFetch, API_BASE } from './shared'
export { ApiError, DEFAULT_TIMEOUT_MS, isAbortError } from '../request'

export * from './diary'
export * from './chat'
export * from './model'
export * from './confirm'
export * from './ledger'
export * from './todo'
export * from './schedule'
export * from './memory-wiki'
export * from './observe'
