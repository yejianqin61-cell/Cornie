import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const checks = [
  ['verify:task349', 'identity_profile 跨天身份沉淀与按需展开'],
  ['verify:task357', 'identity_person 人物页沉淀链路'],
  ['verify:task398', '观察日志归档读取边界与 prompt 装载'],
  ['verify:task399', 'identity 默认注入与条件召回矩阵'],
  ['verify:task402', 'preference 页证据累积与条件注入'],
  ['verify:task403', 'trait 页谨慎写入与情绪场景召回'],
  ['verify:task404', '聊天记录历史分页与长会话边界'],
  ['verify:task405', '聊天记录与 identity/topic/observation 跨源回查'],
  ['verify:task406', '旧 memory_entries 退场与主链唯一主源']
]

for (const [scriptName, label] of checks) {
  console.log(`\n[task407] running ${scriptName} - ${label}`)

  const result = spawnSync('cmd.exe', ['/c', 'npm.cmd', 'run', scriptName], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false
  })

  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error)
    }
    console.error(`\n[task407] failed at ${scriptName}`)
    process.exit(result.status ?? 1)
  }
}

console.log('\nverify-task407-memory-primary-chain-regression: passed')
