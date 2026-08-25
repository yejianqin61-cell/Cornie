// T-02 验收：设计 Token 刻度完整性校验（doc/task-025/T-02）
// 校验项：
//  1. tokens.css 的 @theme static 块包含全部规范 token（颜色/字号 10 档/间距/圆角 5 档/阴影/动效）；
//  2. 旧名兼容层（--bg/--surface/...）与规范名同值（引用 var(--color-*)）；
//  3. style.css 不再自行定义 :root token（已迁移）；
//  4. 示范迁移：LedgerHome/MemoryPageDetail 已消费新 token。
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const tokensPath = path.join(repoRoot, 'src', 'renderer', 'styles', 'tokens.css')
const stylePath = path.join(repoRoot, 'src', 'renderer', 'style.css')
const ledgerPath = path.join(repoRoot, 'src', 'renderer', 'components', 'LedgerHome.vue')
const detailPath = path.join(repoRoot, 'src', 'renderer', 'components', 'MemoryPageDetail.vue')

const tokens = readFileSync(tokensPath, 'utf8')
const themeBlock = tokens.match(/@theme\s+static\s*{([\s\S]*?)}/)?.[1] ?? ''
const styleCss = readFileSync(stylePath, 'utf8')
const ledger = readFileSync(ledgerPath, 'utf8')
const detail = readFileSync(detailPath, 'utf8')

const hasVar = (name) => new RegExp(`--${name}\\s*:`).test(themeBlock)
const varValue = (name) => {
  const m = themeBlock.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`))
  return m ? m[1].trim() : undefined
}

const groups = {
  颜色: ['color-bg', 'color-surface', 'color-surface-2', 'color-text', 'color-muted', 'color-border', 'color-accent', 'color-accent-hover', 'color-danger', 'color-success', 'color-warning', 'color-success-soft', 'color-warning-soft', 'color-danger-soft', 'color-info-soft', 'color-tint-chat', 'color-tint-diary', 'color-tint-ledger', 'color-tint-todo', 'color-tint-schedule', 'color-tint-memory'],
  字号: ['text-xs', 'text-sm', 'text-base', 'text-md', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl'],
  间距: ['spacing-1', 'spacing-2', 'spacing-3', 'spacing-4', 'spacing-5', 'spacing-6', 'spacing-8'],
  圆角: ['radius-sm', 'radius-md', 'radius-lg', 'radius-xl', 'radius-2xl'],
  阴影: ['shadow-card', 'shadow-raised'],
  动效: ['duration-fast', 'duration-base', 'duration-slow', 'ease-standard', 'ease-out'],
  兼容层: ['bg', 'surface', 'surface-2', 'text', 'muted', 'border', 'accent', 'accent-hover', 'danger', 'success', 'warning', 'chat-tint', 'diary-tint', 'ledger-tint', 'todo-tint', 'schedule-tint', 'memory-tint', 'pet-accent', 'pet-text']
}

const failures = []
for (const [group, names] of Object.entries(groups)) {
  for (const name of names) {
    if (!hasVar(name)) failures.push(`缺失 token: ${group} / --${name}`)
  }
}

// 关键同值校验
if (varValue('color-accent') !== '#e8856a') failures.push(`--color-accent 值异常: ${varValue('color-accent')}`)
if (varValue('color-danger') !== '#d96a5c') failures.push(`--color-danger 值异常: ${varValue('color-danger')}`)
if (varValue('text-md') !== '14px') failures.push(`--text-md 应为 14px: ${varValue('text-md')}`)
if (varValue('radius-2xl') !== '20px') failures.push(`--radius-2xl 应为 20px: ${varValue('radius-2xl')}`)

// 兼容层指向规范名
for (const name of ['accent', 'danger', 'surface', 'bg']) {
  if (!new RegExp(`--${name}\\s*:\\s*var\\(--color-${name}\\)`).test(themeBlock)) {
    failures.push(`兼容层 --${name} 未引用 --color-${name}`)
  }
}

// style.css 不再定义 token
if (/--bg\s*:/.test(styleCss)) failures.push('style.css 仍包含 --bg 定义（应已迁移至 tokens.css）')
if (/:root\s*{/.test(styleCss)) failures.push('style.css 仍包含 :root 块（应已迁移至 tokens.css）')

// 示范迁移抽查
if (!ledger.includes('var(--text-md)')) failures.push('LedgerHome.vue 未消费字号 token（示范迁移缺失）')
if (!ledger.includes('color-mix(')) failures.push('LedgerHome.vue 未消费 color-mix（示范迁移缺失）')
if (!detail.includes('var(--color-surface)')) failures.push('MemoryPageDetail.vue 未消费颜色 token（示范迁移缺失）')

const report = { ok: failures.length === 0, failures }
console.log(JSON.stringify(report, null, 2))
if (!report.ok) process.exit(1)
console.log('[verify:task025] tokens OK')
