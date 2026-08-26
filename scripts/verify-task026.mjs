// T-26 全量组件化验收门禁（doc/task-026/T-26-0）
// 用法：node scripts/verify-task026.mjs
// 每个T-26子任务完成时，把覆盖文件登记进 MODULES 并跑本脚本至全绿。
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

// ── 注册表：taskKey -> { files: [{ f, borderAllow?: [selectors], requireUi?: [names] }] }
const MODULES = {
  'T-26-01': {
    files: [
      { f: 'src/renderer/components/MemoryPageDetail.vue', requireUi: ['UiButton', 'UiBadge', 'UiCard', 'UiEmpty'] },
      { f: 'src/renderer/components/MemoryWikiHome.vue' },
      { f: 'src/renderer/components/MemoryWikiTree.vue', borderAllow: ['scrollbar-thumb'] },
      { f: 'src/renderer/components/MemoryWikiConfirmationPanel.vue', requireUi: ['UiCard', 'UiEmpty'] },
      { f: 'src/renderer/components/MemoryWikiGovernanceQueuePanel.vue', requireUi: ['UiCard', 'UiEmpty'] },
      { f: 'src/renderer/components/MemoryWikiGovernanceDetailPanel.vue', requireUi: ['UiCard', 'UiEmpty'] },
      { f: 'src/renderer/components/MemoryWikiTopicIndexPanel.vue', requireUi: ['UiCard', 'UiEmpty'] },
      { f: 'src/renderer/components/MemoryWikiVersionPanel.vue', requireUi: ['UiCard', 'UiEmpty'] },
      { f: 'src/renderer/components/MemoryWikiPageListPanel.vue', requireUi: ['UiCard', 'UiEmpty'] },
      { f: 'src/renderer/components/MemoryWikiPageEditorPanel.vue', requireUi: ['UiCard'] },
      { f: 'src/renderer/components/MemoryWikiWorkspace.vue', requireUi: [] },
      { f: 'src/renderer/composables/useMemoryWikiWorkspace.js' },
    ],
  },
}

const failures = []
let checkedFiles = 0

function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function checkFile(modKey, entry) {
  const abs = path.join(repoRoot, entry.f)
  let text
  try {
    text = readFileSync(abs, 'utf8')
  } catch {
    failures.push(`[${modKey}] 文件不存在: ${entry.f}`)
    return
  }
  checkedFiles += 1

  // 分离 script/template/style 粗略切分（SFC）
  const styleMatches = [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
  const styleText = styleMatches.join('\n')
  const nonStyle =
    text
      .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      // 去掉 JS 注释（粗略）
      .replace(/\/\/[^\n]*/g, '')

  // R1 裸色值：样式块与内联样式（非样式区域出现 rgba( 多为内联样式或 SVG 属性，同样计入）
  const r1Target = stripCssComments(styleText) + '\n' + nonStyle.replace(/[\u4e00-\u9fa5][\s\S]*$/,'') // 防长文案误报不含色值，直接全文查即可
  for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    failures.push(`[R1][${modKey}] ${entry.f} 裸hex: ${m[0]}`)
    break
  }
  if (/rgba?\(/.test(text)) {
    failures.push(`[R1][${modKey}] ${entry.f} 存在 rgba()/rgb() 字面量`)
  }

  // R2 像素字号
  for (const m of text.matchAll(/font-size:\s*\d+(?:\.\d+)?px/g)) {
    failures.push(`[R2][${modKey}] ${entry.f} 像素字号: ${m[0]}`)
    break
  }

  // R3 长中文文案（≥24 个连续汉字/中文标点；注释已剔除）
  for (const m of nonStyle.matchAll(/[\u4e00-\u9fa5][\u4e00-\u9fa5，。！？、：…·（）()]{23,}/g)) {
    failures.push(`[R3][${modKey}] ${entry.f} 长文案(${m[0].length}字): ${m[0].slice(0, 30)}…`)
    break
  }

  // R4 卡片堆叠：注册文件里禁止再声明带边框的盒子选择器（卡片一律 UiCard；
  // 行级分隔等例外走 borderAllow 白名单：selector 片段匹配即放行）
  for (const styleBlock of styleMatches) {
    const css = stripCssComments(styleBlock)
    for (const rule of css.split('}')) {
      const braceIdx = rule.indexOf('{')
      if (braceIdx === -1) continue
      const selector = rule.slice(0, braceIdx).trim()
      const body = rule.slice(braceIdx + 1)
      // 只拦截整盒边框（border:）；border-radius/单侧分隔线不算堆叠
      if (!/(^|[;\s])border:\s/.test(body)) continue
      const allowed = (entry.borderAllow ?? []).some((frag) => selector.includes(frag))
      if (!allowed) {
        failures.push(`[R4][${modKey}] ${entry.f} 选择器「${selector}」声明了边框（卡中卡/盒子感），如确需请登记 borderAllow`)
        break
      }
    }
  }

  // R5 组件库使用：requireUi 列出的组件必须被 import（路径允许 ./ui/ 与 components/ui/）
  for (const uiName of entry.requireUi ?? []) {
    const re = new RegExp(`import\\s+${uiName}\\s+from\\s+'[^']*(?:components/)?ui/${uiName}\\.vue'`)
    if (!re.test(text)) failures.push(`[R5][${modKey}] ${entry.f} 未引入基座组件 ${uiName}`)
  }
}

for (const [modKey, mod] of Object.entries(MODULES)) {
  for (const entry of mod.files) checkFile(modKey, entry)
}

if (checkedFiles === 0) {
  console.log('[verify:task026] (no modules registered)')
  process.exit(0)
}

console.log(JSON.stringify({ ok: failures.length === 0, checkedFiles, failures }, null, 2))
if (failures.length > 0) process.exit(1)
console.log(`[verify:task026] OK (${checkedFiles} files)`)
