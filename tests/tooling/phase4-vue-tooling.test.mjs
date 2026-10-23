import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { assert } from '../shared/service-harness.mjs'

const root = resolve(import.meta.dirname, '../..')
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const eslintConfig = await readFile(resolve(root, 'eslint.config.js'), 'utf8')

assert(packageJson.scripts.lint.includes('src'), 'expected lint script to check src')
assert(packageJson.scripts.lint.includes('stylelint'), 'expected lint script to run stylelint')
assert(packageJson.scripts.lint.includes('prettier --check src'), 'expected lint script to format-check src')
assert(eslintConfig.includes('src/renderer/**/*.{js,vue}'), 'expected ESLint to cover Vue renderer source')

console.log('tests/tooling/phase4-vue-tooling.test.mjs: passed 1/1')
