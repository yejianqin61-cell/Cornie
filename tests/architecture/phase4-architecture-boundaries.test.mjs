import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { assert } from '../shared/service-harness.mjs'

const root = resolve(import.meta.dirname, '../..')
const document = await readFile(resolve(root, 'doc/Cornie-033-Phase4-工程边界与质量约定.md'), 'utf8')

for (const heading of ['## 模块边界', '## 错误模型', '## 业务链复用规则']) {
  assert(document.includes(heading), `expected architecture document to include ${heading}`)
}

assert(document.includes('renderer API'), 'expected renderer API boundary to be documented')
assert(document.includes('HttpError'), 'expected structured HTTP error model to be documented')
assert(document.includes('不新增平行服务'), 'expected reuse rule to prohibit parallel services')
for (const chain of ['聊天链：conversation、chatlog、confirm', '日常业务链：ledger、todo、schedule', '记忆演示链：memory-wiki、governance']) {
  assert(document.includes(chain), `expected business chain reuse map to include ${chain}`)
}

console.log('tests/architecture/phase4-architecture-boundaries.test.mjs: passed 1/1')
