import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { assert } from '../shared/service-harness.mjs'

const root = resolve(import.meta.dirname, '../..')
const runner = await readFile(resolve(root, 'scripts/run-tests.mjs'), 'utf8')

assert(runner.includes('test:frontend'), 'expected full gate to run frontend tests')
assert(runner.includes("'architecture'"), 'expected full gate to run architecture contracts')
assert(runner.includes("'tooling'"), 'expected full gate to run tooling contracts')

console.log('tests/tooling/phase4-full-gate.test.mjs: passed 1/1')
