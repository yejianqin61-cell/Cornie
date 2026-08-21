// 未引用组件扫描（Cornie-021 FE-08）：
// 遍历 src/renderer/components/*.vue，检查其是否被渲染层其他源码（import 或模板 <Tag>）引用；
// 无引用的组件视为死组件，输出警告并以非零退出码结束，供 npm run check:cleanliness 调用。

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const rendererRoot = path.join(repoRoot, 'src', 'renderer')
const componentsDir = path.join(rendererRoot, 'components')

function collectFiles(dir, ext) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectFiles(full, ext))
    else if (entry.name.endsWith(ext)) out.push(full)
  }
  return out
}

function basenameNoExt(file) {
  return path.basename(file).replace(/\.(vue|js)$/, '')
}

const sourceFiles = [
  ...collectFiles(rendererRoot, '.vue'),
  ...collectFiles(rendererRoot, '.js')
]

const componentFiles = collectFiles(componentsDir, '.vue')

function isReferenced(compPath) {
  const name = basenameNoExt(compPath)
  const importPattern = new RegExp(`from\\s*['"][^'"]*\\/?${name}['"]`)
  const tagPattern = new RegExp(`<${name}[\\s/>]`)
  const dynamicPattern = new RegExp(`import\\(['"][^'"]*\\/?${name}['"]\\)`)
  for (const src of sourceFiles) {
    if (src === compPath) continue
    const content = fs.readFileSync(src, 'utf8')
    if (importPattern.test(content) || tagPattern.test(content) || dynamicPattern.test(content)) {
      return true
    }
  }
  return false
}

const unused = componentFiles.filter((comp) => !isReferenced(comp)).map(basenameNoExt)

if (unused.length > 0) {
  console.error(`未引用组件扫描未通过：发现 ${unused.length} 个死组件`)
  for (const name of unused) {
    console.error(`  - ${name}.vue`)
  }
  process.exit(1)
}

console.log(`未引用组件扫描通过：${componentFiles.length} 个组件均被引用。`)
